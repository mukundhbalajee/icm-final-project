// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { on } from 'events';
import * as vscode from 'vscode';
import * as fs from 'fs';

// persistent terminal for SAL commands
let salTerminal: vscode.Terminal | undefined = undefined;
let salConfig: boolean = false;
let rePlayFile: string = '';
const path = require('path'); // Require the path module
const os = require('os');
const extensionId = 'sukumo28.wav-preview';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// ----------------- Commands ----------------- //
	configSalTerminal(context.extensionPath);

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			const languageId = editor.document.languageId;
			console.log(`The user is now editing a file of type: ${languageId}`);
			// You can perform additional actions based on the file type here

			if (languageId === 'sal') {
				configSalTerminal(context.extensionPath);
			}

		}
	}, null, context.subscriptions);

	vscode.window.onDidCloseTerminal(closedTerminal => {
		if (salTerminal === closedTerminal) {
			salTerminal = undefined; // Reset the terminal
			salConfig = false;
		}
	});

	let openTextDocumentListener = vscode.workspace.onDidOpenTextDocument(document => {
		// Check the file type using the languageId or the file extension
		if (document.languageId === 'sal') {
			// Perform an action if a JavaScript file is opened
			configSalTerminal(context.extensionPath);
		}
	});

	let createFilesListener = vscode.workspace.onDidCreateFiles(event => {
		event.files.forEach(uri => {
			// Here you can check the file extension or other properties
			if (uri.path.endsWith('.sal')) {
				// Perform an action if the created file is a JavaScript file
				configSalTerminal(context.extensionPath);
			}
		});
	});

	let runFile = vscode.commands.registerCommand('code-symphony.runFile', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			// Check if the active file is a SAL file
			if (activeTextEditor.document.languageId === 'sal') {
				if (!salTerminal) {
					configSalTerminal(context.extensionPath);
				}
				if (!salConfig) {
					vscode.window.showErrorMessage('SAL configuration not ready. Please try again later.');
					return;
				}

				const fileUri = activeTextEditor.document.uri;
				const content = `load "${fileUri.fsPath}"`;
				const pipePath = '/tmp/control_editor_pipe';

				fs.open(pipePath, 'a', (err, fd) => {
					if (!err) {
						fs.write(fd, content + '\n', (err) => {
							if (err) {
								vscode.window.showErrorMessage('Failed to write to pipe');
							}
						});
						fs.close(fd, (err) => {
							if (err) {
								vscode.window.showErrorMessage('Failed to close pipe');
							}
						});
					} else {
						vscode.window.showErrorMessage('Failed to open pipe');
					}
				});

			} else {
				vscode.window.showErrorMessage('Please select text in a SAL file');
			}
		}
	});

	// execute the highlighted code
	let runSelection = vscode.commands.registerCommand('code-symphony.runSelection', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			// Check if the active file is a SAL file
			if (activeTextEditor.document.languageId === 'sal') {
				if (!salTerminal) {
					configSalTerminal(context.extensionPath);
				}
				if (!salConfig) {
					vscode.window.showErrorMessage('SAL configuration not ready. Please try again later.');
					return;
				} 

				const selection = activeTextEditor.selection;
				const selectedText = activeTextEditor.document.getText(selection);
				console.log(selectedText);
				try {
					// Send the selected text to the terminal
					const pipePath = '/tmp/control_editor_pipe';
					fs.open(pipePath, 'a', (err, fd) => {
						if (!err) {
							fs.writeFileSync(fd, selectedText + '\n');
							fs.close(fd, (err) => {
								if (err) {
									vscode.window.showErrorMessage('Failed to close pipe');
								}
							});
						} else {
							vscode.window.showErrorMessage('Failed to open pipe');
						}
					});
				} catch (error) {
					vscode.window.showErrorMessage('An error occurred while sending the selected text to the pipe');
				}

			} else {
				vscode.window.showErrorMessage('Please select text in a SAL file');
			}
		}
	});


	// code-symphony.replay
	let replay = vscode.commands.registerCommand('code-symphony.replay', function () {
		let status = copyWavFile();
		if (!status) {
			return;
		}

		// TODO: multiple workspaces
		const workspaceDir = getWorkspaceDirectory();
		if (!workspaceDir) {
			vscode.window.showErrorMessage("No workspace or active file found.");
			return;
		}

		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'audioPlayer', // Identifies the type of the webview. Used internally
			`${rePlayFile}`, // Title of the panel displayed to the user
			vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
			{
				// Enable scripts in the webview
				enableScripts: true,
				// Define the root paths for local resources for the webview
				// based on current workspace
				localResourceRoots: [
					vscode.Uri.file(path.join(context.extensionPath, 'res', 'audio')),
					vscode.Uri.file(workspaceDir)
				]
			}
		);

		// Get path to resource on disk
		const onDiskPath = vscode.Uri.file(
			path.join(workspaceDir, ".tmp", rePlayFile)
		);

		// And get the special URI to use with the webview
		const audioSrc = panel.webview.asWebviewUri(onDiskPath);

		// HTML content to play the audio
		// if .wav file, use <audio> tag
		let type;
		if (onDiskPath.fsPath.includes(".wav")) {
			type = "audio/wav";
		} else {
			type = "audio/mp3";
		}

		panel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${rePlayFile}</title>
			</head>
			<body>
				<p>Playing from: ./.tmp/${rePlayFile}</p>
				<audio controls autoplay>
					<source src="${audioSrc}" type="${type}">
				</audio>
			</body>
			</html>
		`;

	});

	let replay2 = vscode.commands.registerCommand('code-symphony.replay2', function () {
		// Get the extension
		const extension = vscode.extensions.getExtension(extensionId);
		// console.log"???");

		if (extension) {
			if (!extension.isActive) {
				// Activate the extension if it's not already active
				extension.activate().then(() => {
					console.log('Extension activated successfully');
					// Now you can use the extension's exported APIs
					const api = extension.exports;
					// Use `api` as defined by the extension you're interacting with
				}, err => {
					// Handle activation error
					console.error('Activation failed', err);
				});
			} else {
				// The extension is already active
				const api = extension.exports;
				// Use `api` as defined by the extension you're interacting with
			}
		} else {
			console.log('Extension not found');
		}
	});

	context.subscriptions.push(runFile);
	context.subscriptions.push(runSelection);
	context.subscriptions.push(replay);
	context.subscriptions.push(replay2);
	context.subscriptions.push(openTextDocumentListener);
	context.subscriptions.push(createFilesListener);

	const nyquistProvider = new NyquistTreeDataProvider();
	const nyquistView = vscode.window.createTreeView('nyquistView', {
        treeDataProvider: nyquistProvider
    });
    context.subscriptions.push(nyquistView);
	context.subscriptions.push(
		vscode.commands.registerCommand('nyquist.toggleSALMode', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('salMode');
			await vscode.workspace.getConfiguration('nyquist').update('salMode', true, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage(`Only support SAL mode: ${!current}`);
			nyquistProvider.refresh();
		}),
		vscode.commands.registerCommand('nyquist.toggleSoundOn', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('soundOn');
			await vscode.workspace.getConfiguration('nyquist').update('soundOn', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`exec sound-${current ? 'off' : 'on'}()`);
			nyquistProvider.refresh();
		}
		),
		vscode.commands.registerCommand('nyquist.toggleAutoNorm', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('autoNorm');
			await vscode.workspace.getConfiguration('nyquist').update('autoNorm', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`exec autonorm-${current ? 'off' : 'on'}()`);
			nyquistProvider.refresh();
		}
		),
		vscode.commands.registerCommand('nyquist.toggleSalTracable', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('salTracable');
			await vscode.workspace.getConfiguration('nyquist').update('salTracable', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`exec sal-tracenable(${boolToLisp(!current)})`);
			nyquistProvider.refresh();
		}
		),
		vscode.commands.registerCommand('nyquist.toggleLispTracable', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('lispTracable');
			await vscode.workspace.getConfiguration('nyquist').update('lispTracable', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`exec xlisp-tracenable(${boolToLisp(!current)})`);
			nyquistProvider.refresh();
		}
		),
		vscode.commands.registerCommand('nyquist.toggleSalBreakEnable', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('salBreakEnable');
			await vscode.workspace.getConfiguration('nyquist').update('salBreakEnable', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`exec sal-breakenable(${boolToLisp(!current)})`);
			nyquistProvider.refresh();
		}
		),
		vscode.commands.registerCommand('nyquist.toggleLispBreakEnable', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('lispBreakEnable');
			await vscode.workspace.getConfiguration('nyquist').update('lispBreakEnable', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`exec xlisp-breakenable(${boolToLisp(!current)})`);
			nyquistProvider.refresh();
		}
		),
		vscode.commands.registerCommand('nyquist.toggleGcFlag', async () => {
			const current = vscode.workspace.getConfiguration('nyquist').get('gcFlag');
			await vscode.workspace.getConfiguration('nyquist').update('gcFlag', !current, vscode.ConfigurationTarget.Global);
			writeToPipe(`set *gc-flag* = ${boolToLisp(!current)}`);
			nyquistProvider.refresh();
		}
		),
        vscode.commands.registerCommand('nyquist.setSampleRate', async () => {
            const result = await vscode.window.showInputBox({
                placeHolder: "Enter the sample rate (Hz)"
            });
            if (result) {
                await vscode.workspace.getConfiguration('nyquist').update('sampleRate', parseFloat(result), vscode.ConfigurationTarget.Global);
				nyquistProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('nyquist.setControlRate', async () => {
            const result = await vscode.window.showInputBox({
                placeHolder: "Enter the control rate (Hz)"
            });
            if (result) {
                await vscode.workspace.getConfiguration('nyquist').update('controlRate', parseFloat(result), vscode.ConfigurationTarget.Global);
				nyquistProvider.refresh();
            }
        }),

        vscode.commands.registerCommand('nyquist.setNyquistDir', async () => {
            const result = await vscode.window.showOpenDialog({
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: 'Select Folder'
            });
            if (result && result.length > 0) {
                await vscode.workspace.getConfiguration('nyquist').update('nyquistDir', result[0].fsPath, vscode.ConfigurationTarget.Global);
				// write the path to ./playback-scripts/.xlisppath
				const path = result[0].fsPath;
				const scriptDirectory = context.extensionPath;
				const xlisppath = `${scriptDirectory}/playback-scripts/.xlisppath`;
				const storePath = `${xlisppath}/nyquist/runtime:${xlisppath}/nyquist/lib`
				fs.writeFileSync(storePath, path);
				nyquistProvider.refresh();
            }
        })
    );
	
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Deactivated");
}

function getWorkspaceDirectory() {
	// Get the current workspace folder
	let workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
	if (workspaceFolder) {
		return workspaceFolder.uri.fsPath; // If a workspace is opened, return its path
	} else if (vscode.window.activeTextEditor) {
		// If no workspace is opened but a file is active, use its directory
		const filePath = vscode.window.activeTextEditor.document.uri.fsPath;
		return path.dirname(filePath);
	} else {
		// Handle cases where no workspace is open and no file is active
		return null;
	}
}

function configSalTerminal(extensionPath: string) {
	if (!salTerminal) {
		salTerminal = vscode.window.createTerminal('SAL Terminal');
	}
	if (!salConfig) {
		let workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;

		// Change to the current directory directory
		let scriptDirectory = path.dirname(__dirname);
		// vscode.window.showInformationMessage(`Script directory: ${scriptDirectory}`);

		salTerminal.sendText(`cd  "${workspaceFolder}"`);
		salTerminal.sendText(`clear`);
		salTerminal.sendText(`bash "${scriptDirectory}/playback-scripts/create_session.sh"`);

		setNyquistPreferences();
	}
	salTerminal.show();
}

function copyWavFile() {
	const username = getCurrentUsername().toLowerCase();
	const tempWavPath = `/tmp/${username}-temp.wav`;
	const workspaceDir = getWorkspaceDirectory();
	if (!workspaceDir) {
		vscode.window.showErrorMessage("No workspace or active file found.");
		return null;
	}
	const tmpDirPath = `${workspaceDir}/.tmp`;
	if (!fs.existsSync(tmpDirPath)) {
        fs.mkdirSync(tmpDirPath);
        console.log('The .tmp directory has been created.');
    }


	// iteratively find the current index for the temp_num.wav file
	let index = 0;
	let destinationPath = '';
	while (true) {
		destinationPath = `${tmpDirPath}/temp_${index}.wav`;
		try {
			fs.accessSync(destinationPath, fs.constants.F_OK);
			index++;
		}
		catch (err) {
			break;
		}
	}

	try {
		// Check if the file exists
		fs.accessSync(tempWavPath, fs.constants.F_OK);

		// If the file exists, copy it
		fs.renameSync(tempWavPath, destinationPath);
		console.log('File moved successfully.');

		rePlayFile = `temp_${index}.wav`;
		vscode.window.showInformationMessage(`Moved ${tempWavPath} to ${destinationPath}`);
	} catch (err) {
		const error = err as NodeJS.ErrnoException;
		if (error.code === 'ENOENT') {
			// Handle the case where the file does not exist
			vscode.window.showErrorMessage(`File not found: ${tempWavPath}`);
		} else {
			// Handle other possible errors
			console.error('Error:', error);
		}
		return null;
	}

	return destinationPath;
}

function getCurrentUsername() {
	return os.userInfo().username;
}

class NyquistTreeDataProvider implements vscode.TreeDataProvider<NyquistItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<NyquistItem | undefined | null> = new vscode.EventEmitter<NyquistItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<NyquistItem | undefined | null> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }

    getTreeItem(element: NyquistItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: NyquistItem): vscode.ProviderResult<NyquistItem[]> {
        if (element) {
            return element.children;
        } else {
            // Root level items
            return [
				new NyquistItem('SAL Mode', {
                    command: 'nyquist.toggleSALMode',
                    title: 'Toggle SAL Mode',
                    arguments: [],
					tooltip: 'Start in SAL mode (not Lisp)'
                }, vscode.workspace.getConfiguration('nyquist').get('salMode') ? 'Enabled' : 'Disabled'),
				new NyquistItem('Sound On', {
                    command: 'nyquist.toggleSoundOn',
                    title: 'Toggle Sound On/Off',
                    arguments: [],
					tooltip: 'Enable sound output in PLAY command'
                }, vscode.workspace.getConfiguration('nyquist').get('soundOn') ? 'Enabled' : 'Disabled'),
				new NyquistItem('Auto Norm', {
                    command: 'nyquist.toggleAutoNorm',
                    title: 'Toggle Auto Norm On/Off',
                    arguments: [],
					tooltip: 'Autonorm'
                }, vscode.workspace.getConfiguration('nyquist').get('autoNorm') ? 'Enabled' : 'Disabled'),
				new NyquistItem('SAL Tracable', {
                    command: 'nyquist.toggleSalTracable',
                    title: 'Toggle SAL Tracable On/Off',
                    arguments: [],
					tooltip: 'Print SAL traceback on SAL error'
                }, vscode.workspace.getConfiguration('nyquist').get('salTracable') ? 'Enabled' : 'Disabled'),
				new NyquistItem('LISP Tracable', {
                    command: 'nyquist.toggleLispTracable',
                    title: 'Toggle LISP Tracable On/Off',
                    arguments: [],
					tooltip: 'Print Lisp traceback on Lisp error'
                }, vscode.workspace.getConfiguration('nyquist').get('lispTracable') ? 'Enabled' : 'Disabled'),
				new NyquistItem('SAL BreakEnable', {
                    command: 'nyquist.toggleSalBreakEnable',
                    title: 'Toggle SAL BreakEnable On/Off',
                    arguments: [],
					tooltip: 'Enable XLISP break on SAL error'
                }, vscode.workspace.getConfiguration('nyquist').get('salBreakEnable') ? 'Enabled' : 'Disabled'),
				new NyquistItem('LISP BreakEnable', {
                    command: 'nyquist.toggleLispBreakEnable',
                    title: 'Toggle LISP BreakEnable On/Off',
                    arguments: [],
					tooltip: 'Enable XLISP break on Lisp error'
                }, vscode.workspace.getConfiguration('nyquist').get('lispBreakEnable') ? 'Enabled' : 'Disabled'),
				new NyquistItem('Garbage Collection', {
                    command: 'nyquist.toggleGcFlag',
                    title: 'Toggle Garbage Collection On/Off',
                    arguments: [],
					tooltip: 'Print info about garbage collection'
                }, vscode.workspace.getConfiguration('nyquist').get('gcFlag') ? 'Enabled' : 'Disabled'),
				
                new NyquistItem('Sample Rate', {
                    command: 'nyquist.setSampleRate',
                    title: 'Set Sample Rate',
                    arguments: []
                }, `${vscode.workspace.getConfiguration('nyquist').get('sampleRate')} Hz`),
                new NyquistItem('Control Rate', {
                    command: 'nyquist.setControlRate',
                    title: 'Set Control Rate',
                    arguments: []
                }, `${vscode.workspace.getConfiguration('nyquist').get('controlRate')} Hz`),
                new NyquistItem('Nyquist Directory', {
                    command: 'nyquist.setNyquistDir',
                    title: 'Set Nyquist Directory',
                    arguments: []
                }, `${vscode.workspace.getConfiguration('nyquist').get('nyquistDir')}`)
            ];
        }
    }
}

class NyquistItem extends vscode.TreeItem {
    children: NyquistItem[] | undefined;

    constructor(
        public readonly label: string,
        public readonly command?: vscode.Command,
        public readonly description?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${this.label} - ${this.description}`;
        this.description = description;
    }
}

function setNyquistPreferences() {
	// get all the preferences
	const salMode = vscode.workspace.getConfiguration('nyquist').get('salMode') as boolean;
	const soundOn = vscode.workspace.getConfiguration('nyquist').get('soundOn') as boolean;
	const autoNorm = vscode.workspace.getConfiguration('nyquist').get('autoNorm') as boolean;
	const salTracable = vscode.workspace.getConfiguration('nyquist').get('salTracable') as boolean;
	const lispTracable = vscode.workspace.getConfiguration('nyquist').get('lispTracable') as boolean;
	const salBreakEnable = vscode.workspace.getConfiguration('nyquist').get('salBreakEnable') as boolean;
	const lispBreakEnable = vscode.workspace.getConfiguration('nyquist').get('lispBreakEnable') as boolean;
	const gcFlag = vscode.workspace.getConfiguration('nyquist').get('gcFlag') as boolean;
	const sampleRate = vscode.workspace.getConfiguration('nyquist').get('sampleRate');
	const controlRate = vscode.workspace.getConfiguration('nyquist').get('controlRate');
	const nyquistDir = vscode.workspace.getConfiguration('nyquist').get('nyquistDir');
	// map true/false to t/nil

	console.log(salMode);
	console.log(soundOn);
	console.log(autoNorm);
	console.log(salTracable);
	console.log(lispTracable);
	console.log(salBreakEnable);
	console.log(lispBreakEnable);
	console.log(gcFlag);
	console.log(sampleRate);
	console.log(controlRate);
	console.log(nyquistDir);

	try {
		// Send the selected text to the terminal
		const pipePath = '/tmp/control_editor_pipe';
		// check if the pipe exists, if not wait for it to be created
		function waitForPipe() {
            fs.access(pipePath, fs.constants.F_OK, (err) => {
                if (err) {
                    // Pipe does not exist
                    console.log("Waiting for the pipe to be created...");
					vscode.window.showInformationMessage('Waiting for the pipe to be created...');
                    setTimeout(waitForPipe, 1000); // Check again in one second

					// check the last line of the pipe
					fs.readFile(pipePath, 'utf8', (err, data) => {
						if (err) {
							console.error(err);
							return;
						}
						const lines = data.trim().split('\n');
						const lastLine = lines.slice(-1)[0];
						if (lastLine === 'NIL') {
							vscode.window.showErrorMessage('Failed to enter SAL mode');
						} else if (lastLine === 'Entering SAL mode ...') {
							vscode.window.showInformationMessage('Entered SAL mode');
						}
					}
					);

                } else {
                    // Pipe exists
                    vscode.window.showInformationMessage('Pipe is now available!');
					// string to write to the pipe
					let content = '';
					content += "(progn\n";
					content += `(setf *sal-compiler-debug* ${boolToLisp(salMode)})\n`;
					content += `(sound-${soundOn ? 'on' : 'off'})\n`;
					content += `(autonorm-${autoNorm ? 'on' : 'off'})\n`;
					content += `(sal-tracenable ${boolToLisp(salTracable)})\n`;
					content += `(sal-breakenable ${boolToLisp(salBreakEnable)})\n`;
					content += `(xlisp-breakenable ${boolToLisp(lispBreakEnable)})\n`;
					content += `(xlisp-tracenable ${boolToLisp(lispTracable)})\n`;
					content += `(setf *gc-flag* ${boolToLisp(gcFlag)})\n`;
					content += `(set-sound-srate ${sampleRate})\n`;
					content += `(set-control-srate ${controlRate})\n`;
					content += `(setdir "${nyquistDir}")\n`;
					content += `;; end preference data transfer\n`;
					content += ")\n";
					// wait writing to the pipe
					writeToPipe(content);
					// timeout before setting salConfig to true
					setTimeout(() => {
						salConfig = true;
					}, 2000);
                }
            });
        }
        waitForPipe();
		
	} catch (error) {
		vscode.window.showErrorMessage('An error occurred while sending the selected text to the pipe');
	}
}

function boolToLisp(booleanValue: boolean) {
    return booleanValue ? 't' : 'nil';
}

function writeToPipe(content: string) {
	const pipePath = '/tmp/control_editor_pipe';
	fs.open(pipePath, 'a', (err, fd) => {
		if (!err) {
			fs.writeFileSync(fd, content + '\n');
			fs.close(fd, (err) => {
				if (err) {
					vscode.window.showErrorMessage('Failed to close pipe');
				}
			});
		}
	}
	);
}