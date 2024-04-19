#!/bin/bash


# This script checks if a path file exists. If the file exists, it reads the path from the file and sets the XLISPPATH variable.
# If the path is correct, it exports the XLISPPATH variable. If the path is incorrect, it waits for a pipe file to be created and then resets the XLISPPATH variable.
# If the path file does not exist, it prompts the user to set the XLISPPATH by calling the "get_xlisp_path" function.

# Variables:
# - PATH_FILE: The path to the file containing the XLISPPATH
# - XLISPPATH: The path to the XLISP interpreter
# - PIPE_FILE: The path to the pipe file used for communication

# Usage:
# - Run the script to check and set the XLISPPATH variable.

# Example:
# $ ./get_XLISP_path.sh


# Function to get the XLISP path from the user and save it to a file
# This function prompts the user to enter the XLISPPATH and saves it to a file named PATH_FILE.
# The XLISPPATH is expected to be in the format: /path/to/nyquist
# The function appends the runtime and lib directories to the XLISPPATH and saves it to the file.
get_xlisp_path() {
    # Ask the user for the path and save it to the file
    echo "Please enter the XLISPPATH (format: /path/to/nyquist):"
    read -p "Your path: " -r userPath
    echo "$userPath/nyquist/runtime:$userPath/nyquist/lib" > "$PATH_FILE"
}

# Function to set the preferences by dumping the sal commands in 
# the preferences file to a named pipe
set_preferences() {
    echo "Setting preferences..."
    # Check if the named pipe exists, wait for it to be created if it doesn't
    PREF_PIPE_FILE="$dir_path/.preferences.lsp"
    while [[ ! -e "$PREF_PIPE_FILE" ]]; do
        sleep 1
    done
    # Copy contents in preferences file to named pipe
    cat "$PREF_PIPE_FILE" > "$PIPE_FILE"
    rm -f "$PREF_PIPE_FILE"
}

# Path to the file where the XLISPPATH will be saved
dir_path="$(realpath "$(dirname "$0")")"
PATH_FILE="$dir_path/.xlisppath"
XLISPPATH=""
PIPE_FILE=/tmp/control_editor_pipe

# Check if the path file exists
if [[ -f "$PATH_FILE" ]]; then
    # Read the path from the file and set the XLISPPATH variable
    XLISPPATH=$(cat "$PATH_FILE")
    echo $XLISPPATH
    read -p "Is this the correct path? (yes/y/no/n) " -r input
    input=$(echo "$input" | tr '[:upper:]' '[:lower:')
    if [[ "$input" == "yes" || "$input" == "y" ]]; then
       export XLISPPATH="$XLISPPATH"
    else
        if [[ ! -p "$PIPE_FILE" ]]; then
            echo "Waiting for pipe to be created..."
            while [[ ! -p "$PIPE_FILE" ]]; do
                sleep 1
            done
        fi

        echo "XLISPPATH_reset" > "$PIPE_FILE"
        get_xlisp_path
        XLISPPATH=$(cat "$PATH_FILE")
        export XLISPPATH="$XLISPPATH"
        echo "Exported XLISPPATH" > "$PIPE_FILE"
        set_preferences
    fi
else
    echo "File not found. Setting XLISPPATH..."
    get_xlisp_path
    set_preferences
fi

# Confirm the XLISPPATH is set
XLISPPATH=$(cat "$PATH_FILE")
echo "XLISPPATH is set to: "$XLISPPATH""
clear
exit
