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
	const Status = {
		None: -1,
		Continue: 0,
		Stop: 1,
		Input: 2,
		Error: 3,
	}
	let state = Status.None

	let path = ""



	const self = {
		compile() {
			if (state != Status.None) {
				return
			}
			const editor = editorFiles[editorCurrent]?.editor
			if (!editor) {
				return
			}
			editor.compile()
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