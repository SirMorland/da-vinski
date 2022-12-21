import os
from aiohttp import web
import socketio
from optimizedSD.optimized_txt2img import generateImages
from inference_gfpgan import fix_faces

path = "../stable-diffusion/models/ldm/stable-diffusion-v1/"
models = os.listdir(path)
paths = {}
for model in models:
	paths[model] = f"../stable-diffusion/models/ldm/stable-diffusion-v1/{model}"

sio = socketio.AsyncServer(
	async_mode='aiohttp',
	async_handlers=True,
	cors_allowed_origins='*',
	ping_timeout=300,
	max_http_buffer_size=8000000)
app = web.Application()
sio.attach(app)

@sio.event
async def connect(sid, environ, auth):
	print('connect ', sid)
	await sio.emit("connected", data=models, room=sid)

@sio.event
def disconnect(sid):
    print('disconnect ', sid)


@sio.event
async def generate(sid, data):
	await sio.emit("started", room=sid)
	await sio.sleep(0)

	if "model" in data:
		modelPath = paths[data["model"]]
		if modelPath:
			data["ckpt"] = modelPath

	images = await generateImages(data, sio, sid)

	await sio.emit(
		"generated",
		data=images,
		room=sid)

@sio.event
async def fixFaces(sid, data):
	await sio.emit("started", room=sid)
	await sio.sleep(0)
	image = await fix_faces(data["data"], sio, sid)

	await sio.emit(
		"generated",
		data=[{
			"seed": data["seed"],
			"steps": data["steps"],
			"data": image,
			"fixed": True
		}],
		room=sid)

if __name__ == '__main__':
	web.run_app(app)