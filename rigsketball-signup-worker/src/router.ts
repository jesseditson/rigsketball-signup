import { AutoRouter, error, withContent } from "itty-router";
import { getToken, googleAPI } from "./google";

const router = AutoRouter({
	before: [withContent],
	catch: error,
});

export type SignupBody = {
	name: string;
	email: string;
	date: string;
	time: string;
};

export type Round = {
	date: string;
	time: string;
	band1: string | null;
	band2: string | null;
	next?: Round;
};

export type StateResponse = {
	rounds: {
		1: Round[];
		2: Round[];
		3: Round[];
	};
};

// router.post('/signup', async (request, env: Env) => {
// 	if (!env.GOOGLE_AUTH) {
// 		throw new Error('Invalid env');
// 	}

// 	// const vals = await getValues('1T__CpRQWSsFfL9Es5noZeq-7K3q8-uuo2XwF6s_IakA', 'Scores!A2:C22', env.GOOGLE_AUTH);
// 	// return vals;
// });

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
	console.log(roundsMap);
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
		rounds: {
			1: scores.values.slice(0, 12).map((rows) => {
				return {
					...parseDate(rows[0]),
					band1: rows[1] || null,
					band2: rows[2] || null,
					next: next(rows[0]),
				};
			}),
			2: scores.values.slice(12, 6).map((rows) => {
				return {
					...parseDate(rows[0]),
					band1: rows[1] || null,
					band2: rows[2] || null,
					next: next(rows[0]),
				};
			}),
			3: scores.values.slice(18, 3).map((rows) => {
				return {
					...parseDate(rows[0]),
					band1: rows[1] || null,
					band2: rows[2] || null,
					next: next(rows[0]),
				};
			}),
		},
	};

	return state;
});

// 404 for everything else
router.all("*", () => new Response("Not Found.", { status: 404 }));

export default router;
