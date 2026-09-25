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

	const self = {
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
					b.className = "filesystem button"
					b.innerText = entry.name
					b.onclick = function() {
						list.open = !list.open
					}
					// nself.innerHTML = `<button class="filesystem button" onclick="console.log(\`${epath}\`)">${entry.name}</button>`
					nself.appendChild(b)


					const files = document.createElement("ul")
					files.className = "filesystem entries"

					await self.buildTree(await dirhandle.getDirectoryHandle(entry.name), files, epath)

					list.appendChild(nself)
					list.appendChild(files)
					parent.appendChild(list)
				} else if(entry.kind == "file") {
					const nself = document.createElement("li")
					nself.className = "filesystem file"
					const b = document.createElement("button")
					b.innerText = entry.name
					b.className = "filesystem button"

					const h = await dirhandle.getFileHandle(entry.name)
					b.addEventListener("dblclick", () => {
						edit(epath, entry.name, h)
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

function getEditorClass(name) {
	const e = name.split(".")
	for (let i = name[0] == "."; i < e.length; i++) {
		const ext = e.slice(i).join(" ")
		if (ext in editorClasses) {
			return editorClasses[ext]
		}
	}
	return null
}


const editorTabContents = document.querySelector("div#editors")
const editorTabList = document.querySelector("div#editlist")
const editorFiles = {}
let editorCurrent = ""
const editorUnsaved = new Set()

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
		compile() {
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
			runtime = editor.compile()
			if (!runtime) {
				console.warn("Failed to compile")
				return false
			}
			ScreenDevice?.clear()
			path = editorCurrent
			fresh = true
			runnable = true
			totalcount = 0
			count = 0
			return true
		},

		run() {
			if (path == null || path != editorCurrent || runtime == null) {
				if (!self.compile()) {
					console.error("Could not compile")
					return
				}
			}
			state = StateContinue
			fresh = false
			running = true

			starttime = performance.now()

			animationframe = requestAnimationFrame(self.frame)
		},

		frame() {
			if (!runnable || !running) {
				cancelAnimationFrame(animationframe)
				animationframe = -1
				return
			}
			if (state == StateInput) {
				return
			}

			const [result, c, callback] = runtime.burst(15, input)
			runtime.markCurrentLine(runtime.getLine())
			input = undefined
			const e = performance.now()

			totalcount += c
			count += c

	        if (e - starttime >= 1000) {
	        	if (e - starttime >= 10000) {
	        		console.error(`One frame ran for ${e - starttime}, stopping`)
	        		running = false
	        		fresh = true
	        	}

	        	console.log(`${count * 1000 / (e - starttime)}(raw ${count}) in the last second`)
	        	starttime = e
	        	count = 0
	        }

	        ScreenDevice.flush()

	        switch (result) {
	        case StateContinue:
	        	animationframe = requestAnimationFrame(self.frame)
	       		break
	       	case StateStop:
	       		console.info("Halted execution")
	       		console.log(runtime)
	       		runnable = false
	       		running = false
				runtime.markCurrentLine(runtime.getLine())
				state = StateNone
				cancelAnimationFrame(animationframe)
				animationframe = -1
				break
			case StateInput:
				state = StateInput
				cancelAnimationFrame(animationframe)
				callback?.()
				break
	        }

		},

		break() {
       		console.info("Execution broken")
       		console.log(runtime)
       		runnable = false
       		running = false
			runtime.markCurrentLine(runtime.getLine())
			state = StateNone
			cancelAnimationFrame(animationframe)
			animationframe = -1
			state = StateNone
		},

		step() {
			if (!runnable || running) {
				return 1
			}
			if (state == StateInput) {
				return 2
			}
			const [result, c, f] = runtime.step(input)
			input = undefined
			console.log(runtime.getLine(), runtime)
			runtime.markCurrentLine(runtime.getLine())

	        ScreenDevice.flush()

	        switch (result) {
	        case StateContinue:
	       		break
	       	case StateStop:
	       		console.info("Halted execution")
	       		console.log(runtime)
	       		runnable = false
	       		running = false
				runtime.markCurrentLine(runtime.getLine())
				state = StateNone
				cancelAnimationFrame(animationframe)
				animationframe = -1
				break
			case StateInput:
				state = StateInput
				cancelAnimationFrame(animationframe)
				f?.()
				break
	        }
		},

		pause() {
			runtime.markCurrentLine(runtime.getLine())
			cancelAnimationFrame(animationframe)
			animationframe = -1
			running = false
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

window.onload = () => {
	for (let b of document.querySelectorAll("button.control.long")) {
		b.onclick = function() {
			document.querySelector(`div.device#${this.id}`).classList.toggle("disabled", this.classList.toggle("disabled"))
		}
	}

	registerView("test", "Test view", document.createElement("div"))
}

document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
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
    }
});