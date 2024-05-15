import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../extension';
import * as mocha from 'mocha';

import * as path from 'path';
import * as fs from 'fs';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	
	mocha.before(async () => {
		// Activate extension before running tests
		console.log('Hello World1');
		// await myExtension.activate({ subscriptions: [] } as unknown as vscode.ExtensionContext);
		// const doc = await vscode.workspace.openTextDocument('./res/test/test.sal');
		// await vscode.window.showTextDocument(doc);
	});
	
	mocha.after(async () => {
		// Deactivate extension after running tests
		console.log('Hello World2');
		// await myExtension.deactivate();
	});

	test('Extension Activation', () => {
		console.log('Extension is activated');
		const extension = vscode.extensions.getExtension('icm.nyquist-sal-extension'); // Replace with your actual extension ID
		assert.ok(extension);		
	});

	test('SAL Terminal Creation', async () => {
		const terminalName = 'SAL Terminal';
		const extension = vscode.extensions.getExtension('icm.nyquist-sal-extension'); // Replace with your actual extension ID
		await extension!.activate(); // activate extension
		assert.ok(extension);
		assert.ok(vscode.window.terminals.find(t => t.name === terminalName), 'SAL Terminal was not created');
	});

	test('SAL File Open Listener', async () => {
		const extension = vscode.extensions.getExtension('icm.nyquist-sal-extension'); // Replace with your actual extension ID
		assert.ok(extension);
		// activate extension
		// await extension!.activate();
		const extensionPath = extension.extensionPath;

		const doc = await vscode.workspace.openTextDocument(path.join(extensionPath, 'res/test/test.sal'));
		const editor = await vscode.window.showTextDocument(doc);

		assert.ok(extension.isActive);
		assert.strictEqual(editor.document.languageId, 'sal');
	});

	test('SAL File Create Listener', async () => {
		// get extension path
		const extension = vscode.extensions.getExtension('icm.nyquist-sal-extension'); // Replace with your actual extension ID
		assert.ok(extension);
		const extensionPath = extension.extensionPath;
		// open workspace at extension path
		await vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.file(extensionPath) });
		
        const workspaceFolders = vscode.workspace.workspaceFolders;
        assert.ok(workspaceFolders, 'No workspace is open');
        
        const workspaceFolder = workspaceFolders![0];
        const testFilePath = path.join(workspaceFolder.uri.fsPath, 'res/test/testFile.sal');

        // Ensure clean slate
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);  // Synchronously delete the file if it exists
        }

        const uri = vscode.Uri.file(testFilePath);
		const content = Buffer.from('play pluck(c4)', 'utf8'); // Content to write to the file
    	await vscode.workspace.fs.writeFile(uri, content); // This creates the file

        const document = await vscode.workspace.openTextDocument(testFilePath);  // Creates a new document for the file
        const textEditor = await vscode.window.showTextDocument(document);

        // Insert content and save the new file
        await textEditor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), 'set testVar = 1\n');
        });
        await document.save();  // This should trigger onDidCreateFiles if the file didn't exist
        // Validate the file was created
        assert.ok(fs.existsSync(testFilePath), 'The file was not saved correctly');

        // Clean up: Delete the file after the test
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

	test('Command Execution - runFile', async () => {
		// Prepare a SAL file in the workspace
		const doc = await vscode.workspace.openTextDocument({
			content: 'test SAL file content',
			language: 'sal'
		});
		await vscode.window.showTextDocument(doc);

		// Execute the command
		await vscode.commands.executeCommand('nyquist-sal-extension.runFile');

		// Verify expected outcome, such as a message being shown, or the terminal receiving certain text
	});
});
