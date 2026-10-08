window.Devices = {}

await (async function() {
	await null
}())


function registerView(id, label, view) {
	let controlcontainer = document.querySelector("div#viewcontrols")
	let viewcontainer = document.querySelector("div#working")

	let btn = document.createElement("button")
	btn.className = "control long disabled"
	btn.innerHTML = label
	btn.id = id

	view.className = "device disabled"
	view.id = id

	btn.onclick = function() {
		view.classList.toggle("disabled", this.classList.toggle("disabled"))
	}

	controlcontainer.appendChild(btn)
	viewcontainer.appendChild(view)
}


window["overlayTabClicked"] = function(self) {
	document.querySelectorAll('div.overlaypage').forEach(t => t.classList.add('disabled'))
	document.querySelectorAll('button.overlaytab').forEach(t => t.classList.add('disabled'))
	document.querySelector(`div.overlaypage#${self.id}`).classList.remove('disabled')
	self.classList.remove('disabled')
}



window["describeDevice"] = function(name, descr) {
	const n = document.createElement("h4")
	n.innerText = name

	const d = document.createElement("p")
	d.innerHTML = descr

	const c = document.querySelector("div.overlaypage#helptabdevices")

	c.appendChild(n)
	c.appendChild(d)
}

window["describeFormat"] = function(name, descr) {
	const n = document.createElement("h4")
	n.innerText = name

	const d = document.createElement("p")
	d.innerHTML = descr

	const c = document.querySelector("div.overlaypage#helptabformats")

	c.appendChild(n)
	c.appendChild(d)
}

function describeShortcut(name, keys) {
	const c = document.querySelector("tbody#shortcutstable")

	const row = document.createElement("tr")
	const n = document.createElement("td")
	n.innerText = name
	row.appendChild(n)
	const keylist = document.createElement("td")
	for (let key of keys) {
		const k = document.createElement("kbd")
		k.innerText = key
		keylist.appendChild(k)
	}
	row.appendChild(keylist)

	c.appendChild(row)
}


class Editor {
	// constructor() {
	// 	throw Error("Abstract method not implemented")
	// }

	getElement() {
		throw Error("Abstract method not implemented")
	}

	getValue() {
		throw Error("Abstract method not implemented")
	}

	setValue(fileHandle) {
		throw Error("Abstract method not implemented")
	}

	onChangeHook(callable) {
		throw Error("Abstract method not implemented")
	}

	compiles() {
		throw Error("Abstract method not implemented")
	}

	setAnnotations(annotations) {
		throw Error("Abstract method not implemented")
	}

	markCurrentLine(line) {
		throw Error("Abstract method not implemented")
	}

	removeCurrentLineMarker() {
		throw Error("Abstract method not implemented")
	}
}

const extensionToAceMode = {
	"py": "python",
	"js": "javascript",
	"ts": "typescript",
	"c": "c_cpp",
}

class PlainTextEditor extends Editor {
	editor
	editorpre

	markedline = -1

	constructor(path) {
		super()

		this.editorpre = document.createElement("pre")
		this.editorpre.className = "editor"
		//this.editorpre.id = path
		this.editor = ace.edit(this.editorpre)
		const ext = path.split(".").pop()
		this.editor.session.setMode(`ace/mode/${extensionToAceMode[ext] ?? ext}`);
    	this.editor.setOptions({useWorker: false})
		this.editorpre.classList.add("hidden")
	}

	getElement() {return this.editorpre}

	getValue(){ return this.editor.getValue()}

	async setValue(value){ return this.editor.setValue(await value.text(), -1)}

	onChangeHook(f) {
		this.editor.getSession().on("change", f)
	}

	compiles() {return false}

	setAnnotations(annotations) {
		this.editor.getSession().setAnnotations(annotations)
	}

	markCurrentLine(line) {
		this.editor.getSession().removeGutterDecoration(this.markedline, "current-executed-line-marker")
		this.editor.getSession().addGutterDecoration(line, "current-executed-line-marker")
		this.markedline = line
	}

	removeCurrentLineMarker() {
		this.editor.getSession().removeGutterDecoration(this.markedline, "current-executed-line-marker")
		this.markedline = -1
	}
}



window["FileSystem"] = function() {
	let dirhandle = null

	const onLoadFileSystem = []

	const self = {
		addOnLoadFileSystem(c) {
			onLoadFileSystem.push(c)
		},

		async loadFileSystem() {
			document.querySelector("button#openfilesystem").innerText = "..."
			let root = document.querySelector("div#filepanel")
			dirhandle = await window.showDirectoryPicker({
	            id: 'neum-filesystem',
	            mode: 'readwrite'
	        })
			document.querySelector("button#openfilesystem").remove()
			document.querySelector("div#openfilesystem").remove()
	        await self.buildTree(dirhandle, root, "")

	        onLoadFileSystem.forEach(c => c())
		},

		async getFileText(path, def="") {
			const fh = await dirhandle.getFileHandle(path, {create: true})
			const f = await fh.getFile()
			const t = await f.text()
			if (t == "" && def != "") {
				const w = await fh.createWritable()
				await w.write(def)
				await w.close()
				return def
			}
			return t
		},
		async setFileText(path, text) {
			const fh = await dirhandle.getFileHandle(path, {create: true})
			const f = await fh.getFile()
			const w = await fh.createWritable()
			await w.write(text)
			await w.close()
		},

		async getFileHandle(path) {
			const p = path.slice(1).split("/")
			const d = dirhandle
			for(let i = 0; i < p.length - 1; i++) {
				d = await d.getDirectoryHandle(p[1], {create: true})
			}
			return await d.getFileHandle(p.pop(), {create: true})
		},

		async saveCurrent() {
			const h = editorFiles[editorCurrent]?.handle
			if (!h) {
				return
			}

			const w = await h.createWritable()
			await w.write(editorFiles[editorCurrent].editor.getValue())
			await w.close()

			editorUnsaved.delete(editorCurrent)
		},

		async buildTree(dirhandle, parent, path) {
			const entries = [];
		    for await (const entry of dirhandle.values()) {
		        entries.push(entry)
		    }
		    
		    entries.sort((a, b) => {
		        if (a.kind === 'directory' && b.kind !== 'directory') return -1
		        if (a.kind !== 'directory' && b.kind === 'directory') return 1
		        
		        return a.name.localeCompare(b.name);
		    })

		    for await (const entry of entries) {
				const epath = `${path}/${entry.name}`

				if (entry.kind == "directory") {
					const list = document.createElement("details")
					list.className = "filesystem folder"

					const nself = document.createElement("summary")
					const b = document.createElement("button")
					b.draggable = true
					b.className = "filesystem button"
					b.innerText = entry.name
					b.onclick = function() {
						list.open = !list.open
					}
					
					b.addEventListener('dragstart', (e) => {
						e.dataTransfer.setData('neumeditor/directory', JSON.stringify({
							path: epath,
							name: entry.name,
						}))
						e.dataTransfer.effectAllowed = 'copy';
					})
					// nself.innerHTML = `<button class="filesystem button" onclick="console.log(\`${epath}\`)">${entry.name}</button>`
					nself.appendChild(b)


					const files = document.createElement("ul")
					files.className = "filesystem entries"

					await self.buildTree(await dirhandle.getDirectoryHandle(entry.name), files, epath)

					list.appendChild(nself)
					list.appendChild(files)
					parent.appendChild(list)
				} else if(entry.kind == "file") {
					if (["/.drives"].includes(epath)) {
						continue
					}

					const nself = document.createElement("li")
					nself.className = "filesystem file"
					const b = document.createElement("button")

					b.draggable = true
					b.innerText = entry.name
					b.className = "filesystem button"

					const h = await dirhandle.getFileHandle(entry.name)
					b.addEventListener("dblclick", () => {
						edit(epath, entry.name, h)
					})
					
					b.addEventListener('dragstart', (e) => {
						e.dataTransfer.setData('neumeditor/file', JSON.stringify({
							path: epath,
							name: entry.name,
						}))
						e.dataTransfer.effectAllowed = 'copy';
					})

					nself.appendChild(b)

					parent.appendChild(nself)
				}
			}

		}
	}

	return self
}()

const editorClasses = {}

window["registerExtension"] = function (ext, editor) {
	editorClasses[ext] = editor
}

window["getEditorClass"] = function (name) {
	const e = name.split(".")
	for (let i = name[0] == "."; i < e.length; i++) {
		const ext = e.slice(i).join(" ")
		if (ext in editorClasses) {
			return editorClasses[ext]
		}
	}
	return null
}

window["getEditorClasses"] = function() {return editorClasses}


const editorTabContents = document.querySelector("div#editors")
const editorTabList = document.querySelector("div#editlist")
const editorFiles = {}
let editorCurrent = ""
const editorUnsaved = new Set()


window["getEditors"] = function() {
	return editorFiles
}

function switchTo(path) {
	editorFiles[editorCurrent]?.view.classList.add("hidden")
	editorFiles[editorCurrent]?.tab.classList.add("hidden")

	editorCurrent = path

	editorFiles[editorCurrent]?.view.classList.remove("hidden")
	editorFiles[editorCurrent]?.tab.classList.remove("hidden")
}

function close(path) {
	var m = editorFiles[path]
	if (m == undefined) {
		return
	}
	m.view.remove()
	m.tab.remove()
	delete editorFiles[path]
}

window["edit"] = async function(path, name, handle) {
	if (path in editorFiles) {
		switchTo(path)
		return
	}

	const editorclass = getEditorClass(name) ?? PlainTextEditor

	const tab = document.createElement("div")
	tab.className = "editor"
	const btn = document.createElement("button")
	btn.innerText = name
	btn.onclick = function() {
		switchTo(path)
	}
	btn.className = "editor"
	const closebtn = document.createElement("button")
	closebtn.innerText = "X"
	closebtn.onclick = async function() {
		await close(path)
	}
	closebtn.className = "closeeditor"
	tab.appendChild(btn)
	tab.appendChild(closebtn)
	tab.classList.add("hidden")

	const editor = new editorclass(path)
	await editor.setValue(await handle.getFile())

	const editorelement = editor.getElement()
	const editorwrapper = document.createElement("div")
	editorwrapper.className = "editorwrapper hidden"
	editorwrapper.appendChild(editorelement)
	editorTabContents.appendChild(editorwrapper)
	editorTabList.appendChild(tab)

	editorFiles[path] = {
		"tab": tab, "view": editorwrapper, "handle": handle, "editor": editor
	}

	editor.onChangeHook(function() {
		editorUnsaved.add(path)
		tab.classList.add("unsaved")
	})

	switchTo(path)
}

window["RuntimeManager"] = function() {
	const StateNone = -1
	const StateContinue = 0
	const StateStop = 1
	const StateInput = 2
	const StateError = 3

	let state = -1

	let path = ""

	let runtime = null
	let animationframe = -1

	let fresh = false
	let runnable = false
	let running = false

	let input = undefined

	let totalcount = 0
	let count = 0

	let starttime = 0

	const self = {
		interceptsKeyboard() {
			return running
		},

		async compile() {
			if (state != StateNone) {
				// console.warn("Compiling while running")
				// return false
				self.break()
			}
			if (animationframe != -1) {
				console.warn("Compiling while animation frame present")
				return false
			}
			const editor = editorFiles[editorCurrent]?.editor
			if (!editor) {
				console.warn("No editor to compile")
				return false
			}
			runtime = await editor.compile()
			if (!runtime) {
				console.warn("Failed to compile")
				return false
			}
			ScreenDevice.clearBuffer()
			ScreenDevice.clear()
			path = editorCurrent
			fresh = true
			runnable = true
			totalcount = 0
			count = 0
			return true
		},

		async run() {
			if (path == null || path != editorCurrent || runtime == null) {
				if (!await self.compile()) {
					console.error("Could not compile")
					return
				}
			}
			state = StateContinue
			fresh = false
			running = true

			starttime = performance.now()

			animationframe = requestAnimationFrame(self.frame)

			document.querySelector("button#play").style.background = "gray"
			document.querySelector("button#pause").style.background = "white"
			document.querySelector("button#stop").style.background = "white"
			document.querySelector("button#step").style.background = "white"
		},

		async frame() {
			if (!runnable || !running) {
				cancelAnimationFrame(animationframe)
				animationframe = -1
				return
			}
			if (state == StateInput) {
				return
			}

			const [result, c, callback] = runtime.burst(15, input)
			runtime?.markCurrentLine(runtime.getLine())
			input = undefined
			const e = performance.now()

			totalcount += c
			count += c

	        if (e - starttime >= 1000) {
	        	if (e - starttime >= 10000) {
	        		console.error(`One frame ran for ${e - starttime}, stopping`)
	        		self.pause()
	        		return
	        	}

	        	console.log(`${count * 1000 / (e - starttime)}(raw ${count}) in the last second`)
	        	starttime = e
	        	count = 0
	        }

	        ScreenDevice.flush()
	        ConsoleDevice.flush()

	        switch (result) {
	        case StateContinue:
	        	animationframe = requestAnimationFrame(self.frame)
	       		break
	       	case StateStop:
	       		console.info("Halted execution")
	       		console.log(runtime)
	       		runnable = false
	       		running = false
				runtime?.markCurrentLine(runtime.getLine())
				await runtime.dispose()
				runtime = null
				state = StateNone
				cancelAnimationFrame(animationframe)
				animationframe = -1

			document.querySelector("button#play").style.background = "white"
			document.querySelector("button#pause").style.background = "gray"
			document.querySelector("button#stop").style.background = "gray"
			document.querySelector("button#step").style.background = "white"
				break
			case StateInput:
				state = StateInput
				cancelAnimationFrame(animationframe)
				callback?.()
				break
	        }

		},

		async break() {
       		console.info("Execution broken")
       		console.log(runtime)
       		runnable = false
       		running = false
			runtime?.markCurrentLine(runtime.getLine())
			await runtime?.dispose()
			runtime = null
			state = StateNone
			cancelAnimationFrame(animationframe)
			animationframe = -1
			state = StateNone

			document.querySelector("button#play").style.background = "white"
			document.querySelector("button#pause").style.background = "gray"
			document.querySelector("button#stop").style.background = "gray"
			document.querySelector("button#step").style.background = "white"
		},

		async step() {
			if (path == null || path != editorCurrent || runtime == null) {
				if (!await self.compile()) {
					console.error("Could not compile")
					return
				}
			}
			if (!runnable || running) {
				return 1
			}
			if (state == StateInput) {
				return 2
			}

			document.querySelector("button#play").style.background = "white"
			document.querySelector("button#pause").style.background = "gray"
			document.querySelector("button#stop").style.background = "white"
			document.querySelector("button#step").style.background = "white"

			const [result, c, f] = runtime.step(input)
			input = undefined
			console.log(runtime.getLine(), runtime)
			runtime?.markCurrentLine(runtime.getLine())

	        ScreenDevice.flush()
	        ConsoleDevice.flush()

	        switch (result) {
	        case StateContinue:
	       		break
	       	case StateStop:
	       		console.info("Halted execution")
	       		console.log(runtime)
	       		runnable = false
	       		running = false
				runtime?.markCurrentLine(runtime.getLine())
				runtime = null
				await runtime.dispose()
				state = StateNone
				cancelAnimationFrame(animationframe)
				animationframe = -1

			document.querySelector("button#play").style.background = "white"
			document.querySelector("button#pause").style.background = "gray"
			document.querySelector("button#stop").style.background = "gray"
			document.querySelector("button#step").style.background = "white"
				break
			case StateInput:
				state = StateInput
				cancelAnimationFrame(animationframe)
				f?.()
				break
	        }
		},

		pause() {
			runtime?.markCurrentLine(runtime.getLine())
			cancelAnimationFrame(animationframe)
			animationframe = -1
			running = false

			document.querySelector("button#play").style.background = "white"
			document.querySelector("button#pause").style.background = "gray"
			document.querySelector("button#stop").style.background = "white"
			document.querySelector("button#step").style.background = "white"
		},

		sendInput(value) {
			input = value
			state = StateContinue
			if (running === true) {
				animationframe = requestAnimationFrame(self.frame)
			}
		}
	}

	return self
}()




window["DriveManager"] = await (function() {
	const drives = []
	const driveTemplate = document.querySelector("template#drive-template")
	const container = document.querySelector("div.drivelist")

	const self = {
		init() {
			FileSystem.addOnLoadFileSystem(self.onLoadFileSystem)

			return self
		},

		async saveDrives() {
			await FileSystem.setFileText(".drives", JSON.stringify(drives.map(d => {
				return {
					path: d.path, name: d.name, size: d.size, type: d.type
				}
			})))
		},

		async onLoadFileSystem() {
			const info = JSON.parse(await FileSystem.getFileText(".drives", "[]"))

			for (let d of info) {
				const o = self.createDrive()
				const drive = o.drive

				o.path = d.path
				o.type = d.type
				o.size = d.size
				o.name = d.name

				drive.querySelector("input#path").value = d.path
				drive.querySelector("select#type").value = d.type
				drive.querySelector("input#size").value = d.size
				drive.querySelector("input#name").value = d.name
			}
		},

		createDrive() {
			const drive = driveTemplate.content.cloneNode(true).querySelector("div.drive")
			drive.querySelector(".deletedrive").addEventListener("dbclick", () => self.removeDrive(drive))
			container.appendChild(drive)
			const o = {path: "", name: "", size: 0, type: "Binary", drive: drive}

			drive.querySelector("input#path").addEventListener("input", async (e) => {
				o.path = e.target.value
				await self.saveDrives()
			})
			drive.querySelector("select#type").addEventListener("input", async (e) => {
				o.type = e.target.value
				await self.saveDrives()
			})
			drive.querySelector("input#size").addEventListener("input", async (e) => {
				const size = Number(e.target.value)

				o.size = size

				if (size < 0) {
					await self.saveDrives()
					return
				}

				const fh = await FileSystem.getFileHandle(o.path)
				const f = await fh.getFile()

				const c = new Uint8Array(f.arrayBuffer())
				const contents = new Uint8Array(size).fill(0)
				contents.set(c.subarray(0, size))

				const w = await fh.createWritable()
				w.write(contents)
				w.close()

				await self.saveDrives()
			})
			drive.querySelector("input#name").addEventListener("input", async (e) => {
				o.name = e.target.value
				await self.saveDrives()
			})

			drive.querySelector("div.drivedroppath").addEventListener("dragover", (e) => {
				e.preventDefault()
			})
			drive.querySelector("div.drivedroppath").addEventListener("drop", async (e) => {
				const { path, name } = JSON.parse(e.dataTransfer.getData('neumeditor/file'))
				o.path = path
				drive.querySelector("input#path").value = path
				await self.saveDrives()
			})

			drive.object = o

			drives.push(o)

			return o
		},

		async getDriveHandle(name) {
			const drive = drives.find(o => o.name == name)

			if(!drive) {
				return null
			}

			return {...drive, handle: await FileSystem.getFileHandle(drive.path)}
		}
	}
	return self.init
}())()






window.onload = () => {
	for (let b of document.querySelectorAll("button.control.long")) {
		b.onclick = function() {
			document.querySelector(`div.device#${this.id}`).classList.toggle("disabled", this.classList.toggle("disabled"))
		}
	}
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        if (event.altKey) {
        	switch (event.code) {
        	case "KeyR":
        		console.log("recording")
        		ScreenDevice.btnRecord()
        		break
        	case "KeyS":
        		if (event.shiftKey) {
        			ScreenDevice.btnScreenshot()
        		} else {
        			ScreenDevice.btnCopy()
        		}
        		break
        	case "KeyQ":
        		console.log("stopped recording")
        		if (event.shiftKey) {
        			ScreenDevice.btnStopCopy()
        		} else {
        			ScreenDevice.btnStop()
        		}
        		break
        	}
        } else {
	        switch (event.code) {
	            case 'KeyS':
	            	if (event.shiftKey) {
		    			event.preventDefault()
		    			break
	            	} else {
		            	event.preventDefault()
		            	FileSystem.saveCurrent()
		                break;
		            }
	            case 'KeyQ':
	            	event.preventDefault()
	            	close(editorCurrent)
	                break;
	            case 'KeyN':
	            	event.preventDefault()
	            	break;
	        }
        }
    }
    else if (event.altKey) {
    	switch (event.code) {
    	case "KeyR":
    		RuntimeManager.run()
        	event.preventDefault()
    		break
    	case "KeyB":
    		RuntimeManager.break()
        	event.preventDefault()
    		break
    	case "KeyP":
    		RuntimeManager.pause()
        	event.preventDefault()
    		break
    	case "KeyS":
    		RuntimeManager.step()
        	event.preventDefault()
    		break
    	case "KeyC":
    		RuntimeManager.compile()
        	event.preventDefault()
    		break
    	}
    } else {
    	switch (event.code) {
    	case "F1":
    		if (RuntimeManager.interceptsKeyboard()) {
    			return
    		}
    		document.querySelector("div.overlay#help").style.display = ""
    		event.preventDefault()
    		break
    	case "Escape":
    		if (RuntimeManager.interceptsKeyboard()) {
    			return
    		}
    		if (document.querySelector("div.overlay#help").style.display == "") {
    			document.querySelector("div.overlay#help").style.display = "none"
    			event.preventDefault()
    		}
    		break
    	}
    }
});
describeShortcut("Show this screen", ["F1"])
describeShortcut("Save current file", ["Ctrl", "S"])
describeShortcut("Close current file", ["Ctrl", "Q"])
describeShortcut("Start screen recording", ["Ctrl", "Alt", "R"])
describeShortcut("Stop screen recording", ["Ctrl", "Alt", "Q"])
describeShortcut("Copy screen to clipboard", ["Ctrl", "Alt", "S"])
describeShortcut("Save screen as image", ["Ctrl", "Alt", "S"])
describeShortcut("Run current file", ["Alt", "R"])
describeShortcut("Stop current execution", ["Alt", "B"])
describeShortcut("Pause current execution", ["Alt", "P"])
describeShortcut("Step through current file", ["Alt", "S"])
describeShortcut("Compile current file", ["Alt", "C"])