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
				vscode.window.showInformationMessage('SAL file created');
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
				const selection = activeTextEditor.selection;
				const selectedText = activeTextEditor.document.getText(selection);
				console.log(selectedText);
				try {
					vscode.window.showInformationMessage(selectedText);
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

	const sampleRateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    sampleRateItem.command = "nyquist.setSampleRate";
    sampleRateItem.text = `Sample Rate: ${vscode.workspace.getConfiguration('nyquist').get('sampleRate')} Hz`;
    sampleRateItem.show();

    const controlRateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    controlRateItem.command = "nyquist.setControlRate";
    controlRateItem.text = `Control Rate: ${vscode.workspace.getConfiguration('nyquist').get('controlRate')} Hz`;
    controlRateItem.show();

    const nyquistDirItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    nyquistDirItem.command = "nyquist.setNyquistDir";
    nyquistDirItem.text = `Nyquist Dir: ${vscode.workspace.getConfiguration('nyquist').get('nyquistDir')}`;
    nyquistDirItem.show();

	context.subscriptions.push(vscode.commands.registerCommand('nyquist.setSampleRate', async () => {
        const value = await vscode.window.showInputBox({ prompt: 'Enter a new sample rate (Hz)' });
        if (value) {
            await vscode.workspace.getConfiguration('nyquist').update('sampleRate', Number(value), vscode.ConfigurationTarget.Global);
            sampleRateItem.text = `Sample Rate: ${value} Hz`;
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('nyquist.setControlRate', async () => {
        const value = await vscode.window.showInputBox({ prompt: 'Enter a new control rate (Hz)' });
        if (value) {
            await vscode.workspace.getConfiguration('nyquist').update('controlRate', Number(value), vscode.ConfigurationTarget.Global);
            controlRateItem.text = `Control Rate: ${value} Hz`;
        }
    }));

	context.subscriptions.push(vscode.commands.registerCommand('nyquist.setNyquistDir', async () => {
        const result = await vscode.window.showOpenDialog({
            canSelectMany: false,
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: 'Select Nyquist Directory'
        });
        if (result && result.length > 0) {
            const folderPath = result[0].fsPath;
            await vscode.workspace.getConfiguration('nyquist').update('nyquistDir', folderPath, vscode.ConfigurationTarget.Global);
            nyquistDirItem.text = `Nyquist Dir: ${folderPath}`;
        }
    }));


	context.subscriptions.push(runFile);
	context.subscriptions.push(runSelection);
	context.subscriptions.push(replay);
	context.subscriptions.push(replay2);
	context.subscriptions.push(openTextDocumentListener);
	context.subscriptions.push(createFilesListener);
	context.subscriptions.push(sampleRateItem, controlRateItem, nyquistDirItem);
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
		salConfig = true;
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