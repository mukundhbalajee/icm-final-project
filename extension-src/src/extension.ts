// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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
	});

	let disposable2 = vscode.commands.registerCommand('code-symphony.displayTime', () => {
		vscode.window.showInformationMessage(new Date().toLocaleTimeString());
	});

	let disposable3 = vscode.commands.registerCommand('code-symphony.warningMsg', () => {
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


	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable3);
	context.subscriptions.push(disposable4);
	context.subscriptions.push(disposable5);
	context.subscriptions.push(myStatusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() { }
