# Da Vinski

A beautiful Web UI for Stable Diffusion and GFPGAN.

## Installation

### Backend

#### 1. Create virtual environment
Use Python 3.8
```bash
python -m venv venv
source venv/bin/activate
```

#### 2. Install dependencies

```bash
pip install torch --extra-index-url https://download.pytorch.org/whl/cu117
pip install -r backend/requirements.txt
```

#### 3. Add models

##### Stable Diffusion
Save latest Stable Diffusion model from https://huggingface.co/CompVis to `stable-diffusion/models/ldm/stable-diffusion-v1/model.ckpt`.

##### GFPGAN

```bash
cd GFPGAN
wget https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth -P experiments/pretrained_models
```

### Frontend

```bash
cd frontend
npm ci
```

## Running

### Backend

```bash
cd backend
python server.py
```

### Frontend

```bash
cd frontend
npm start
```