// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { on } from 'events';
import * as vscode from 'vscode';
import * as fs from 'fs';

// persistent terminal for SAL commands
let salTerminal: vscode.Terminal | undefined = undefined;
let salConfig: boolean = false;
let showGraph: boolean = false;
let rePlayFile: string = '';
const path = require('path'); // Require the path module
const os = require('os');
const extensionId = 'sukumo28.wav-preview';

function getCurrentTime() {
	let date = new Date();
	return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
}

function getCurrentUsername() {
	return os.userInfo().username;
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

function checkIfFileExists(filePath: string, fileType: string, fileExtension: string) {
	return fs.readdirSync(filePath).some(file => file.startsWith(fileType) && file.endsWith(fileExtension));
}

function getMostRecentFilePath(directory: string, fileName: string, fileExtension: string) {
	const files = fs.readdirSync(directory);
	const resFiles = files.filter(file => file.startsWith(fileName) && file.endsWith(fileExtension));

	// Sort the files by creation time in descending order
	resFiles.sort((a, b) => {
		const aCreationTime = fs.statSync(path.join(directory, a)).birthtime;
		const bCreationTime = fs.statSync(path.join(directory, b)).birthtime;
		return bCreationTime.getTime() - aCreationTime.getTime();
	});
	return path.join(directory, resFiles[0]);
}

function configSalTerminal(extensionPath: string) {
	if (!salTerminal) {
		salTerminal = vscode.window.createTerminal('SAL Terminal');
	}
	if (!salConfig) {
		let workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace found');
			return;
		}

		// Change to the current directory directory
		let scriptDirectory = path.dirname(__dirname);
		salTerminal.sendText(`cd  "${workspaceFolder}"`);

		salTerminal.sendText(`clear`);
		salTerminal.sendText(`bash "${scriptDirectory}/playback-scripts/create_session.sh"`);

		salConfig = true;
	}
	salTerminal.show();
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// ----------------- Commands ----------------- //
	configSalTerminal(context.extensionPath);

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			const currDocument = editor.document;
			console.log(`The user is now editing a file of type: ${currDocument.languageId}`);
			// You can perform additional actions based on the file type here

			if (currDocument.languageId === 'sal') {
				configSalTerminal(context.extensionPath);
			}
			// if (currDocument.languageId === 'plaintext' && currDocument.fileName.endsWith('.dat')) {
			// 	vscode.window.showInformationMessage('Plotting selected graph...');
			// 	vscode.commands.executeCommand('nyquist-sal-extension.plotGraph');
			// }
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
			// Perform an action if a SAL file is opened
			configSalTerminal(context.extensionPath);
		}
		// if (document.languageId === 'plaintext' && document.fileName.endsWith('.dat')) {
		// 	vscode.window.showInformationMessage('Plotting selected graph...');
		// 	vscode.commands.executeCommand('nyquist-sal-extension.plotGraph');
		// }
	});

	let createFilesListener = vscode.workspace.onDidCreateFiles(event => {
		event.files.forEach(uri => {
			// Here you can check the file extension or other properties
			if (uri.path.endsWith('.sal')) {
				// Perform an action if the created file is a SAL file
				vscode.window.showInformationMessage('SAL file created');
				configSalTerminal(context.extensionPath);
			}
			// if (uri.path.endsWith('.dat')) {
			// 	// Perform an action if the created file is a dat file
			// 	vscode.window.showInformationMessage('Plotting selected graph...');
			// 	vscode.commands.executeCommand('nyquist-sal-extension.plotGraph');
			// }
		});
	});

	let runFile = vscode.commands.registerCommand('nyquist-sal-extension.runFile', () => {
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

	let interactiveSal = vscode.commands.registerCommand('nyquist-sal-extension.interactiveSal', () => {
		const userInput = vscode.window.showInputBox({
			placeHolder: "Enter something",
			prompt: "Please enter your input",
		});
		// if (userInput) {
		// 	vscode.window.showInformationMessage(`User entered: ${userInput}`);
		// }
		// message 
		// vscode.window.showInformationMessage('Hello World VSCode from nyquist-sal-extension!');
	});

	// execute the highlighted code
	let runSelection = vscode.commands.registerCommand('nyquist-sal-extension.runSelection', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			// Check if the active file is a SAL file
			if (activeTextEditor.document.languageId === 'sal') {
				const selection = activeTextEditor.selection;
				const selectedText = activeTextEditor.document.getText(selection);
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


	// TODO: Need to fix!!!!
	let replay = vscode.commands.registerCommand('nyquist-sal-extension.replay', function () {
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

	let replay2 = vscode.commands.registerCommand('nyquist-sal-extension.replay2', function () {
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

	let plotGraphs = vscode.commands.registerCommand("nyquist-sal-extension.plotGraph", function () {
		if (!vscode.window.activeTextEditor) {
			return;
		}

		// Get all files in the 'res/plot/' directory
		const plotDir = `${getWorkspaceDirectory()}/res/plot/`;

		// Check if the directory exists recursively
		if (!fs.existsSync(plotDir)) {
			fs.mkdirSync(plotDir, { recursive: true });
		}

		// Check if the file exists
		if (checkIfFileExists(plotDir, "points_", ".dat") === false) {
			vscode.window.showInformationMessage('No graph to plot!');
			return;
		}

		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			"sal-plotGraphs", "Viewing file", vscode.ViewColumn.Beside, {
				enableScripts: true,
				enableCommandUris: true,
				retainContextWhenHidden: true
			}
		);

		// Construct the file path
		const filePath = getMostRecentFilePath(plotDir, "points_", ".dat");
		const fileContent = fs.readFileSync(filePath, 'utf-8');

		// Parse the file content and extract the months and data
		const lines = fileContent.split('\n');
		const time: string = lines.map((line: string) => line.split(' ')[0]).join(', ');
		const value: string = lines.map((line: string) => line.split(' ')[1]).join(', ');

		panel.webview.html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Line Chart Example</title>
				<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
			</head>
			<body>
				<h1>Your plot!</h1>
				<div style="padding: 20px; background-color: rgb(173, 173, 173);">
					<canvas id="userPlot"></canvas>
				</div>

				<script>
					// Get the canvas element
					var ctx = document.getElementById('userPlot').getContext('2d');

					// Define the data for the chart
					var data = {
						labels: [${time}],
						datasets: [{
							data: [${value}],
							borderColor: 'rgb(255, 99, 132)',
							backgroundColor: 'rgba(255, 99, 132, 0.2)'
						}]
					};
					
					var displayedXlabels = {};
					var displayedYlabels = {};
					// Create the chart
					var userPlot = new Chart(ctx, {
						type: 'line',
						data: data,
						options: {
							// This hook is called before the chart is updated
							beforeUpdate: function(chart) {
								chart.displayedXLabels = {};
								chart.displayedYLabels = {};
							},
							plugins: {
								legend: {
									display: false
								}
							},
							scales: {
								x: {
									type: 'linear',
									ticks: {
										stepSize: 0.5
									},
									min: 0,
									max: Math.ceil(Math.max(...data.labels))
								},
								y:{
									type: 'linear',
								}
							}
						}
					});
				</script>
			</body>
			</html>
		`;

		panel.onDidDispose(() => {
			panel?.dispose();
		});
		
		panel.reveal(undefined, true);
	});

	// Watch the 'res/plot/' directory for changes
	if (vscode.workspace.workspaceFolders) {
		const plotDir = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'res/plot/');
		const soundDir = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'res/audio/');
		
		// Check if the directory exists
		if (!fs.existsSync(plotDir)) {
			// If the directory does not exist, create it
			fs.mkdirSync(plotDir, { recursive: true });
		}

		// Check if the directory exists
		if (!fs.existsSync(soundDir)) {
			// If the directory does not exist, create it
			fs.mkdirSync(soundDir, { recursive: true });
		}
		fs.watch(plotDir, (eventType: string, filename: string | null) => {
			showGraph = fs.readdirSync(plotDir).some(file => file.startsWith('points_') && file.endsWith('.dat'));
		});
	}

	context.subscriptions.push(runFile);
	context.subscriptions.push(interactiveSal);
	context.subscriptions.push(runSelection);
	context.subscriptions.push(replay);
	context.subscriptions.push(replay2);
	context.subscriptions.push(openTextDocumentListener);
	context.subscriptions.push(createFilesListener);
	context.subscriptions.push(plotGraphs);
}

// This method is called when your extension is deactivated
export function deactivate() { }
