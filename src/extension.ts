// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { on } from 'events';
import * as vscode from 'vscode';
import * as fs from 'fs';
import hoverData from './data/hoverData.json';

// persistent terminal for SAL commands
let salTerminal: vscode.Terminal | undefined = undefined;
let salConfig: boolean = false;
let showGraph: boolean = false;
let rePlayFile: string = '';
const path = require('path'); // Require the path module
const os = require('os');
const extensionId = 'sukumo28.wav-preview';

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

function checkIfFileExists(filePath: string, fileExtension: string) {
	return fs.readdirSync(filePath).some(file => file.endsWith(fileExtension));
}

function getMostRecentFileName(directory: string, fileExtension: string) {
	// Construct the file path
	const files = fs.readdirSync(directory);
	const resFiles = files.filter(file => file.endsWith(fileExtension));
	
	// Sort the files by creation time in descending order
	resFiles.sort((a, b) => {
		const aCreationTime = fs.statSync(path.join(directory, a)).birthtime;
		const bCreationTime = fs.statSync(path.join(directory, b)).birthtime;
		return bCreationTime.getTime() - aCreationTime.getTime();
	});
	return resFiles[0];
}

function configSalTerminal() {
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

// Method to handle hovering logic for builtin functions
function handleHover(word: string) {
	const hoverInfo = (hoverData as any)[word];
    if (hoverInfo) {
        const markdownString = new vscode.MarkdownString('', true);
        markdownString.appendCodeblock(hoverInfo.function, 'sal'); // 'sal' or appropriate language ID
        markdownString.appendMarkdown(`\n---\n${hoverInfo.description}`);

        return new vscode.Hover(markdownString);
    }
    return undefined;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// ----------------- Hovering ----------------- //
	context.subscriptions.push(vscode.languages.registerHoverProvider('sal', {
        provideHover(document, position, token) {
            const wordPattern = /[\w-]+(?=\()/g;
            const range = document.getWordRangeAtPosition(position, wordPattern);
            const word = document.getText(range);

            return handleHover(word);
        }
    }));

	// ----------------- Commands ----------------- //
	configSalTerminal();

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			const currDocument = editor.document;
			console.log(`The user is now editing a file of type: ${currDocument.languageId}`);
			// You can perform additional actions based on the file type here

			if (currDocument.languageId === 'sal') {
				configSalTerminal();
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
			// Perform an action if a SAL file is opened
			configSalTerminal();
		}
	});

	let createFilesListener = vscode.workspace.onDidCreateFiles(event => {
		event.files.forEach(uri => {
			// Here you can check the file extension or other properties
			if (uri.path.endsWith('.sal')) {
				// Perform an action if the created file is a SAL file
				vscode.window.showInformationMessage('SAL file created');
				configSalTerminal();
			}
		});
	});

	let runFile = vscode.commands.registerCommand('nyquist-sal-extension.runFile', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			// Check if the active file is a SAL file
			if (activeTextEditor.document.languageId === 'sal') {
				if (!salTerminal) {
					configSalTerminal();
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

	let replay = vscode.commands.registerCommand('nyquist-sal-extension.replay', function () {
		const workspaceDir = getWorkspaceDirectory();
		if (!workspaceDir) {
			vscode.window.showErrorMessage("No workspace or active file found.");
			return;
		}

		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'audioPlayer', // Identifies the type of the webview. Used internally
			'Replaying Last Created Sound...', // Title of the panel displayed to the user
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

		const workspaceFolders = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace found');
			return;
		}

		const resAudioFolder = path.join(workspaceFolders.uri.fsPath, 'res/audio/');
		const mostRecentSoundFile = getMostRecentFileName(resAudioFolder, ".wav");
		// Get path to resource on disk
		const onDiskPath = vscode.Uri.file(
			path.join(resAudioFolder, mostRecentSoundFile)
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
				<title>Replaying Last Created Sound...</title>
			</head>
			<body>
				<p>Playing ${mostRecentSoundFile}</p>
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
		if (checkIfFileExists(plotDir, ".dat") === false) {
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
		
		const currFileName = getMostRecentFileName(plotDir, ".dat");
		const filePath = path.join(plotDir, currFileName);

		// Check if the directory exists
		if (!fs.existsSync(plotDir)) {
			vscode.window.showErrorMessage('Directory does not exist');
			return;
		}

		// Check if the file exists
		if (!fs.existsSync(filePath)) {
			vscode.window.showErrorMessage('File does not exist');
			return;
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8');

		// Get the file names in the directory
		let workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;
		var checkboxesHtml = '';
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace found');
		}
		else {
			let fileNames = fs.readdirSync(path.join(workspaceFolder, 'res', 'plot'));

			// Filter out non-file entities
			fileNames = fileNames.filter(fileName => fs.statSync(path.join(workspaceFolder, 'res', 'plot', fileName)).isFile());
			// New code to create a checkbox for each file
			checkboxesHtml = fileNames.map(fileName => {
				const isChecked = fileName === currFileName ? 'checked' : '';
				return `<label><input type="checkbox" name="fileCheckbox" value="${fileName}" onchange="updateData()" ${isChecked}>${fileName}</label><br>`;
			}).join('');
		}

		// Parse the file content and extract the months and data
		const lines = fileContent.split('\n');
		const time: string = lines.map((line: string) => line.split(' ')[0]).join(', ');
		const value: string = lines.map((line: string) => line.split(' ')[1]).join(', ');

		// Setup message listener from the webview
		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'getFileData':
						// Read each selected file
						const datasets = message.filename.map((filename: string) => {
							const filePath = path.join(workspaceFolder, 'res', 'plot', filename);
							const fileContent = fs.readFileSync(filePath, 'utf8');
							const lines = fileContent.split('\n');
							const timeData = lines.map(line => line.split(' ')[0]);
							const valueData = lines.map(line => line.split(' ')[1]);
							return {
								filename: filename,
								time: timeData,
								value: valueData
							};
						});

						// Send the datasets back to the webview
						panel.webview.postMessage({ command: 'updateChart', datasets: datasets });
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		panel.webview.html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Nyquist Graphs!</title>
				<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
				<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@1.0.1"></script>
			</head>
			<body>
				<h1>Your plot!</h1>
				<button onclick="toggleDropdown()" class="dropbtn">Select Files</button>
				<div id="fileCheckboxes">
					${checkboxesHtml}
				</div>
				<button onclick="resetZoom()">Reset Zoom</button>

				<div style="padding: 20px; background-color: rgb(173, 173, 173);">
					<canvas id="userPlot"></canvas>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					// Function to send a message to the extension to request file data
					function updateData() {
						// Get all checked checkboxes
						const selectedFiles = Array.from(document.querySelectorAll('input[name="fileCheckbox"]:checked')).map(checkbox => checkbox.value);
						// Send filenames to the extension
						vscode.postMessage({
						command: 'getFileData',
						filename: selectedFiles
						});
					}

					function generateRandomColor(opacity = 1) {
						const r = Math.floor(Math.random() * 255);
						const g = Math.floor(Math.random() * 255);
						const b = Math.floor(Math.random() * 255);
						return "rgba(" + r + ", " + g + ", " + b + ", " + opacity + ")";
					}

					// This function will be called when the user clicks the 'Reset Zoom' button
					function resetZoom() {
						if (userPlot) {
							userPlot.resetZoom();
						}
					}

					// Get the canvas element
					var ctx = document.getElementById('userPlot').getContext('2d');

					// Define the data for the chart
					var data = {
						labels: [${time}],
						datasets: [{
							label: "${currFileName}",
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
								zoom: {
									// pan: {
									// 	enabled: true,
									// 	mode: 'x',
									// 	// Set your desired panning options here
									// },
									zoom: {
										drag: {
											enabled: true,
											mode: 'x' 
										},
										mode: 'x',
									},
								}
							},
							scales: {
								x: {
									type: 'linear',
									ticks: {
										stepSize: 0.5
									}
									// min: 0,
									// max: Math.ceil(Math.max(...data.labels))
								},
								y:{
									type: 'linear',
								},
							}
						}
					});

					// Handler for the message sent from the extension with the file data
					window.addEventListener('message', event => {
						const message = event.data; // The JSON data our extension sent
						switch (message.command) {
							case 'updateChart':
								// Clear existing datasets
								userPlot.data.datasets = [];

								// Add each dataset to the chart
								message.datasets.forEach(dataset => {
									userPlot.data.labels = dataset.time; // Assumes all datasets have the same x-axis labels
									userPlot.data.datasets.push({
										label: dataset.filename,
										data: dataset.value,
										borderColor: generateRandomColor(), // You need to define this function
										backgroundColor: generateRandomColor(0.2), // Adjust opacity for background
									});
								});
								userPlot.update();
								break;
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
			showGraph = fs.readdirSync(plotDir).some(file => file.endsWith('.dat'));
		});
	}

	context.subscriptions.push(runFile);
	context.subscriptions.push(runSelection);
	context.subscriptions.push(replay);
	context.subscriptions.push(replay2);
	context.subscriptions.push(openTextDocumentListener);
	context.subscriptions.push(createFilesListener);
	context.subscriptions.push(plotGraphs);
}

// This method is called when your extension is deactivated
export function deactivate() { }
