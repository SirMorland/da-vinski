import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";

let socket: Socket;

interface Data {
	seed: number,
	steps: number,
	url: string,
	fixed?: boolean,
};

const ENHANCE_STEPS: {[key: number]: number} = {
	2: 5,
	5: 10,
	10: 20,
	20: 50,
	50: 100,
	100: 200,
	200: 500
};

function App() {
	const [prompt, setPrompt] = useState("");
	const [initialSteps, setInitialSteps] = useState<number>();
	const [width, setWidth] = useState<number>();
	const [height, setHeight] = useState<number>();
	const [model, setModel] = useState<string>();
	const [models, setModels] = useState<string[]>();
	const [seeds, setSeeds] = useState<number[]>([]);
	const [data, setData] = useState<{[key: string]: Data[]}>({});
	const [loading, setLoading] = useState({loading: false, current: 0, total: 0, message: ""});
	const [selected, select] = useState<Data>();

	const navigate = useNavigate();

	useEffect(() => {
		const wsURL: string = process.env.REACT_APP_WS_URL || "";
		socket = io(wsURL);

		socket.on("connect", () => {
			console.log("connect");
		});

		socket.on("disconnect", () => {
			console.log("disconnect"); 

			setLoading({
				loading: false,
				current: 0,
				total: 0,
				message: ""
			});
		});
		
		socket.on("connected", (models: string[]) => {
			console.log("connected");
			setModels(models);
		});

		socket.on("started", () => {
			setLoading({
				loading: true,
				current: 0,
				total: 0,
				message: "Initializing"
			});
		});
		socket.on("status", ({step, total}: {step: number, total: number}) => {
			setLoading({
				loading: true,
				current: step,
				total,
				message: "Sampling"
			});
		});
		socket.on("generated", async (data: {seed: number, steps: number, data: ArrayBuffer, fixed?: boolean}[]) => {
			const seedList: number[] = [];
			const urls: {[key: string]: Data} = {};
			await Promise.all(
				data.map(a =>
					new Promise<void>(resolve => {
						const file = new File([a.data], "image.png", {type: "image/png"});

						const fr = new FileReader();
						fr.onload = () => {
							console.log(fr.result);
							seedList.push(a.seed);
							const d = {seed: a.seed, steps: a.steps, url: fr.result as string, fixed: a.fixed};
							urls[a.seed] = d;
							select(old => {
								if (old?.seed === d.seed) {
									navigate("", {state: d});
									return d;
								}
								return old;
							});
							resolve();
						}
						fr.readAsDataURL(file);
					})
				)
			);

			setSeeds(oldSeeds => {
				const newSeeds = [...oldSeeds];
				seedList.forEach(s => {
					if (!newSeeds.includes(s)) {
						newSeeds.push(s);
					}
				})
				return newSeeds;
			});

			setData(oldData => {
				const newData: {[key: string]: Data[]} = {};
				Object.keys(oldData).forEach(key => {
					newData[key] = [...oldData[key]];
				});
				Object.keys(urls).forEach((key: string) => {
					if (!newData[key]) {
						newData[key] = [];
					}
					newData[key].push(urls[key]);
					newData[key].sort((a, b) => a.steps - b.steps);
				});
				return newData;
			});

			setLoading({
				loading: false,
				current: 0,
				total: 0,
				message: ""
			});

			navigator.vibrate([100, 100, 100, 100, 100]);
		});

		window.onpopstate = (event: any) => {
			console.log(event.state);
			if (event.state.usr) {
				select(event.state.usr);
			} else {
				select(undefined);
			}
		}
	}, [navigate]);

	const submit = (event: any) => {
		event.preventDefault();
		socket.emit("generate", {
			prompt,
			steps: initialSteps ?? 20,
			width,
			height,
			model,
			samples: 9,
		});
	}

	const input = (event: any) => {
		setPrompt(event.target.value);
	}
	const inputWidth = (event: any) => {
		setWidth(parseInt(event.target.value));
	}
	const inputHeight = (event: any) => {
		setHeight(parseInt(event.target.value));
	}
	const inputSteps = (event: any) => {
		setInitialSteps(parseInt(event.target.value));
	}
	const inputModel = (event: any) => {
		setModel(event.target.value);
	}

	const selectImage = (image?: Data) => {
		select(image);
		navigate("", {state: image});
	}

	const enhance = (event: any) => {
		event.stopPropagation();

		if (ENHANCE_STEPS[selected?.steps || 20]) {
			socket.emit("generate", {
				prompt,
				steps: ENHANCE_STEPS[selected?.steps || 20],
				width,
				height,
				model,
				samples: 1,
				seed: selected?.seed
			});
		}
	}

	const fixFaces = (event: any) => {
		event.stopPropagation();

		socket.emit("fixFaces", {
			seed: selected?.seed,
			steps: selected?.steps,
			data: selected?.url
		});
	}

	const options = [];
	for (let i = 256; i <= 2048; i += 64) {
		options.push(i);
	}

	return (
		<main>
			<h1 onClick={() => selectImage(undefined)}>Da Vinski</h1>
			{loading.loading ?
				<div>
					<h2>{loading.message}{loading.total > 0 && `: ${loading.current}/${loading.total}`}</h2>
				</div>
			:
				seeds.length > 0 ?
					selected ?
						<div className="image-view">
							<h3>{prompt}</h3>
							<img src={selected.url} alt={prompt} />
							<div className="info">
								<div className="buttons">
									<p>Seed: <span>{selected.seed}</span></p>
									<p>Steps: <span>{selected.steps}</span></p>
								</div>
								<div className="buttons">
									<button onClick={enhance} disabled={!ENHANCE_STEPS[selected.steps]}>ENHANCE</button>
									<button onClick={fixFaces}>FIX FACES</button>
									<a className="button" href={selected.url} download={`seed_${selected.seed}_steps_${selected.steps}`}>SAVE</a>
								</div>
								{data[selected.seed].length > 1 &&
									<div className="strip">
										{data[selected.seed].map((d, i) =>
											<div key={i}>
												<img src={d.url} onClick={() => selectImage(d)} alt={prompt} />
												<p>Steps {d.steps}{d.fixed && " (fixed faces)"}</p>
											</div>
										)}
									</div>
								}
							</div>
						</div>
					:
						<div>
							<h3>{prompt}</h3>
							<div className="image-grid">
								{seeds.map((seed, i) =>
									<img key={i} src={data[seed][data[seed].length - 1].url} onClick={() => selectImage(data[seed][data[seed].length - 1])} alt={prompt} />
								)}
							</div>
						</div>
				:
					<form onSubmit={submit}>
						<textarea value={prompt} onInput={input} placeholder="Prompt" />
						<div className="buttons">
							<select value={width} defaultValue="Width" onChange={inputWidth}>
								<option disabled>Width</option>
								{options.map(option =>
									<option key={option} style={option % 3 == 0 ? {backgroundColor: "hsl(35deg, 70%, 80%)"} : undefined}>{option}</option>
								)}
							</select>
							<select value={height} defaultValue="Height" onChange={inputHeight}>
								<option disabled>Height</option>
								{options.map(option =>
									<option key={option} style={option % 3 == 0 ? {backgroundColor: "hsl(35deg, 70%, 80%)"} : undefined}>{option}</option>
								)}
							</select>
							<select value={initialSteps} defaultValue="Steps" onChange={inputSteps}>
								<option disabled>Steps</option>
								{[5, 10, 20, 50, 100].map(m =>
									<option key={m}>{m}</option>
								)}
							</select>
							<select value={model} defaultValue="Model" onChange={inputModel}>
								<option disabled>Model</option>
								{models?.map(m =>
									<option key={m}>{m}</option>
								)}
							</select>
							<button type="submit">GENERATE</button>
						</div>
					</form>
			}
		</main>
	);
}

export default App;
