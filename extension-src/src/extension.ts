// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { on } from 'events';
import * as vscode from 'vscode';

// persistent terminal for SAL commands
let salTerminal: vscode.Terminal | undefined = undefined;
let salConfig: boolean = false;
const path = require('path'); // Require the path module

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
			const fileUri = activeTextEditor.document.uri;

			console.log(fileUri);
			console.log(activeTextEditor.document.getText());

			const content = activeTextEditor.document.getText();
			const terminal = vscode.window.createTerminal('Nyquist');
			terminal.show();
			terminal.sendText('cat ' + fileUri.fsPath);
		}
	});

	let interactiveSal = vscode.commands.registerCommand('code-symphony.interactiveSal', () => {
		const userInput = vscode.window.showInputBox({
			placeHolder: "Enter something",
			prompt: "Please enter your input",
		});
		if (userInput) {
			vscode.window.showInformationMessage(`User entered: ${userInput}`);
		}

		// const panel = vscode.window.createWebviewPanel(
		//     'webView', // Identifies the type of the webview. Used internally
		//     'WebView Title', // Title of the panel displayed to the user
		//     vscode.ViewColumn.One, // Editor column to show the new webview panel in.
		//     {} // Webview options. More details can be found in the documentation.
		// );

		// panel.webview.html = `<html><body>You can include any content here</body></html>`;

		// message 
		vscode.window.showInformationMessage('Hello World VSCode from code-symphony!');
	});

	// execute the highlighted code
	let runSelection = vscode.commands.registerCommand('code-symphony.runSelection', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			const selection = activeTextEditor.selection;
			const selectedText = activeTextEditor.document.getText(selection);
			console.log(selectedText);
			vscode.window.showInformationMessage(selectedText);
		}
	});

	// code-symphony.replay
	let replay = vscode.commands.registerCommand('code-symphony.replay', function () {
		// TODO: multiple workspaces
		const workspaceDir = getWorkspaceDirectory();
		if (!workspaceDir) {
			vscode.window.showErrorMessage("No workspace or active file found.");
			return;
		}

		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'audioPlayer', // Identifies the type of the webview. Used internally
			'Audio Player', // Title of the panel displayed to the user
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
			path.join(context.extensionPath, 'res', 'audio', 'p5cross2.mp3')
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
				<title>Audio Player</title>
			</head>
			<body>
				<audio controls autoplay>
					<source src="${audioSrc}" type="${type}">
				</audio>
			</body>
			</html>
		`;

	});

	context.subscriptions.push(runFile);
	context.subscriptions.push(interactiveSal);
	context.subscriptions.push(runSelection);
	context.subscriptions.push(replay);
	context.subscriptions.push(openTextDocumentListener);
	context.subscriptions.push(createFilesListener);


	// ----------------- Reference Code ----------------- //
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-symphony" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('code-symphony.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World VSCode from code-symphony!');
		vscode.window.showInformationMessage(new Date().toLocaleTimeString());
		vscode.window.showWarningMessage('This is a warning message!');
	});

	// launch cat command in terminal
	let disposable4 = vscode.commands.registerCommand('code-symphony.launchTerminal', () => {
		const terminal = vscode.window.createTerminal('My Terminal');
		terminal.show();

		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			const fileUri = activeTextEditor.document.uri;
			// print the file uri
			console.log(fileUri);
			console.log(activeTextEditor.document.getText());
			// store the content of the file
			const content = activeTextEditor.document.getText();
			// launch command in terminal
			terminal.sendText('cat ' + fileUri.fsPath);
			terminal.sendText('bash ' + fileUri.fsPath);
		}
		terminal.sendText('echo "Hello, World!!!!"');

	});

	// load the current file in the browser
	let disposable5 = vscode.commands.registerCommand('code-symphony.openInBrowser', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		if (activeTextEditor) {
			const fileUri = activeTextEditor.document.uri;
			// open the file using the default software for the file type
			vscode.env.openExternal(fileUri);
		}
	});

	// create an icon in the status bar
	let myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.text = `$(file-code)`;
	myStatusBarItem.command = 'code-symphony.helloWorld';
	myStatusBarItem.show();

	// create a new tab in the lower panel
	let disposable6 = vscode.commands.registerCommand('code-symphony.createPanel', () => {
		const panel = vscode.window.createWebviewPanel(
			'catCoding',
			'Cat Coding',
			vscode.ViewColumn.One,
			{}
		);

		panel.webview.html = "<h1>Hello, World!</h1>";
		// panel.webview.html = getWebviewContent();
	});

	let disposable8 = vscode.commands.registerCommand('code-symphony.createTextable', () => {
		const panel = vscode.window.createWebviewPanel(
			'inputTab', // Identifies the type of the webview. Used internally
			'User Input Tab', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				// Enable scripts in the webview
				enableScripts: true
			}
		);

		panel.webview.html = getWebviewContent2();
	});
	

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable4);
	context.subscriptions.push(disposable5);
	context.subscriptions.push(disposable6);
	context.subscriptions.push(disposable8);
	context.subscriptions.push(myStatusBarItem);

}

// This method is called when your extension is deactivated
export function deactivate() { }


// Generates the HTML content for the webview
function getWebviewContent() {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Two Column Layout</title>
            <style>
                body, html {
                    height: 100%;
                    margin: 0;
                    display: flex;
                    flex-direction: row;
                }
                .column {
                    flex: 50%;
                    padding: 10px;
                    height: 100%; /* Should be removed. Only for demonstration */
                }
                /* You can add more styles here to customize your layout */
            </style>
        </head>
        <body>
            <div class="column" style="background-color:#aaa;">
                <h2>Column 1</h2>
                <p>Some text..</p>
            </div>
            <div class="column" style="background-color:#bbb;">
                <h2>Column 2</h2>
                <p>Some text..</p>
            </div>
        </body>
        </html>
    `;
}
function getWebviewContent2() {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>User Input</title>
        </head>
        <body>
            <h1>User Input</h1>
            <input type="text" id="inputField" placeholder="Type something...">
            <button onclick="sendInput()">Submit</button>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function sendInput() {
                    const input = document.getElementById('inputField').value;
                    vscode.postMessage({
                        command: 'input',
                        text: input
                    });
                }
            </script>
        </body>
        </html>
    `;
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
		// let workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;
		
		// Change to the current directory directory
		let scriptDirectory = path.dirname(__dirname);
		// vscode.window.showInformationMessage(`Script directory: ${scriptDirectory}`);

		salTerminal.sendText(`cd  "${scriptDirectory}"`);
		salTerminal.sendText('clear');
		salTerminal.sendText('bash ./playback-scripts/create_session.sh  > /dev/null');
		salConfig = true;
	}
	salTerminal.show();
}
