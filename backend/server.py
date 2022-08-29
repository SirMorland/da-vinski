from aiohttp import web
import socketio
from optimizedSD.optimized_txt2img import generateImages
from inference_gfpgan import fix_faces

sio = socketio.AsyncServer(
	async_mode='aiohttp',
	async_handlers=True,
	cors_allowed_origins='*',
	ping_timeout=300)
app = web.Application()
sio.attach(app)

@sio.event
async def connect(sid, environ, auth):
	print('connect ', sid)
	await sio.emit("connected", room=sid)

@sio.event
def disconnect(sid):
    print('disconnect ', sid)


@sio.event
async def generate(sid, data):
	await sio.emit("started", room=sid)
	await sio.sleep(0)
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
			"data": image
		}],
		room=sid)

if __name__ == '__main__':
	web.run_app(app)