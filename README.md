# Neum Editor
Neum Editor is an IDE and an emulator for various architectures

# Running
## Pages
The project is already usable and it is hosted on Github Pages: https://zhoeshin.github.io/NeumEditor/

## Running locally
All you need to do is to download the source code and run a local server in its directory. Simply:
- Clone the repo: `git clone https://github.com/zHoeshin/NeumEditor.git`
- Go to folder: `cd NeumEditor`
- Run the server, with `python -m http.server 8080` or `http-server -p 8080` or any other local server runner
- The editor is accessible on your `localhost:8080`

# Features
## Native file editing
The editor allows selecting a folder and editing files in it, fully locally on your machine

## Vanilla JavaScript
This project does not require installation of any package manager. The only dependencies are natively loaded from CDNs

## Screen
The screen can have any size and supports many color modes, including RGBA8888, RGB565, RGB444, Monochrome (8-bit), Pico8 color scheme

## Console
The emulator includes a 80x24 character terminal that supports many ANSI sequences

## Support for URCL
[URCL, Universal Reduced Computer Language](https://github.com/ModPunchtree/URCL), is a simple universal intermediate language.

## Support for BatPU2
[BatPU2](https://www.youtube.com/watch?v=osFa7nwHHz4&list=PL5LiOvrbVo8nPTtdXAdSmDWzu85zzdgRT) is an educational CPU created by [mattbatwings](https://www.youtube.com/mattbatwings)

## Support for Chip8