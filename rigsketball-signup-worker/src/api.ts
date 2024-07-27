import { Router, error, withContent } from "itty-router";
import { getToken, googleAPI } from "./google";

const router = Router({
  before: [withContent],
});

export type SignupBody = {
  name: string;
  email: string;
  phone: string;
  date?: string;
  time?: string;
};

export type Round = {
  date: string;
  time: string;
  band1: string | null;
  band2: string | null;
  next?: Round;
};

export type StateResponse = {
  rounds: Round[];
};

router.post("/signup", async (request, env: Env) => {
  if (!env.GOOGLE_AUTH) {
    throw new Error("Invalid env");
  }
  const signup = (await request.json()) as SignupBody;
  if (!signup.name || !signup.email || !signup.phone) {
    throw new Error("Invalid body");
  }
  const google = googleAPI(
    await getToken(env.GOOGLE_AUTH),
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`
  );
  const scores = (await google(
    "GET",
    "values/Scores!A2:C22?majorDimension=ROWS"
  )) as {
    range: string;
    values: string[][];
  };
  const bands = (await google(
    "GET",
    "values/Bands!A:B?majorDimension=ROWS"
  )) as {
    range: string;
    values: string[][];
  };
  let bandName = signup.name.toLowerCase();
  const existingBandIdx = bands.values.findIndex((r) => {
    if (
      r[0]?.toLowerCase() === signup.name.toLowerCase() ||
      r[1]?.toLowerCase() === signup.email.toLowerCase()
    ) {
      bandName = r[0].toLowerCase();
      return true;
    }
    return false;
  });
  if (existingBandIdx === -1) {
    const nextBandIndex = bands.values.length + 1;
    console.log("ADDING", signup.name, signup.email, nextBandIndex);
    const bandRange = `Bands!A${nextBandIndex}:C${nextBandIndex}`;
    await google("PUT", `values/${bandRange}?valueInputOption=USER_ENTERED`, {
      range: bandRange,
      values: [[signup.name, signup.email, signup.phone]],
    });
  } else {
    console.log(`EXISTS: ${signup.name} (${signup.email})`);
  }
  if (!signup.date || !signup.time) {
    return;
  }
  const desiredDateIdx = scores.values.findIndex((s) => {
    return s[0] == `${signup.date} ${signup.time}`;
  });
  console.log("FOUND", desiredDateIdx);
  if (desiredDateIdx === -1) {
    throw new Error("Invalid date");
  }
  let writeCell = `B${desiredDateIdx + 2}`;
  const desiredDate = scores.values[desiredDateIdx];
  if (desiredDate[1]) {
    writeCell = `C${desiredDateIdx + 2}`;
  }
  if (desiredDate[1] && desiredDate[2]) {
    throw new Error("Sorry, this slot is no longer available.");
  }
  const existingCells: string[] = [];
  scores.values.forEach((s, index) => {
    if (s[1]?.toLowerCase() == bandName) {
      existingCells.push("B" + (2 + index));
    }
    if (s[2]?.toLowerCase() == bandName) {
      existingCells.push("C" + (2 + index));
    }
  });
  if (existingCells.length) {
    console.log("CLEARING", existingCells);
    await Promise.all(
      existingCells.map(async (cell) => {
        return await google("POST", `values/Scores!${cell}:clear`);
      })
    );
  }
  console.log("CLAIMING", writeCell);
  return await google(
    "PUT",
    `values/Scores!${writeCell}?valueInputOption=USER_ENTERED`,
    {
      range: `Scores!${writeCell}`,
      values: [[signup.name]],
    }
  );
});

const dateRE = /^(\w+ \d+) (.+)$/;
const parseDate = (d: string) => {
  const parsed = d.match(dateRE);
  if (!parsed) {
    throw new Error(`Invalid Date ${d}`);
  }
  return {
    date: parsed[1],
    time: parsed[2],
  };
};

router.get("/state", async (request, env: Env) => {
  if (!env.GOOGLE_AUTH) {
    throw new Error("Invalid env");
  }
  const google = googleAPI(
    await getToken(env.GOOGLE_AUTH),
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}`
  );
  const rounds = (await google(
    "GET",
    "values/Rounds!A2:C13?majorDimension=ROWS"
  )) as {
    range: string;
    values: string[][];
  };
  const roundsMap = new Map();
  rounds.values.forEach((round) => {
    roundsMap.set(round[0], round[1]);
    roundsMap.set(round[1], round[2]);
  });
  const scores = (await google(
    "GET",
    "values/Scores!A2:C22?majorDimension=ROWS"
  )) as {
    range: string;
    values: string[][];
  };

  const next = (round: string): Round | undefined => {
    const nr = roundsMap.get(round);
    if (!nr) {
      return undefined;
    }
    const found = scores.values.find((v) => v[0] == nr);
    if (!found) {
      throw new Error(`Couldn't find ${nr} in scores`);
    }
    return {
      ...parseDate(found[0]),
      band1: found[1] || null,
      band2: found[2] || null,
      next: next(found[0]),
    };
  };

  const state: StateResponse = {
    rounds: scores.values.slice(0, 12).map((rows) => {
      return {
        ...parseDate(rows[0]),
        band1: rows[1] || null,
        band2: rows[2] || null,
        next: next(rows[0]),
      };
    }),
  };

  return state;
});

// 404 for everything else
router.all("*", () => new Response("Not Found.", { status: 404 }));

export default router;
