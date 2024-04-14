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
    # Check if the nyquist folder exists in the path
    if [[ -d "$userPath/nyquist" ]]; then
        XLISPPATH="$userPath/nyquist/runtime:$userPath/nyquist/lib"
        update_config "USER_NYQUIST_FILE_PATH" "$XLISPPATH"
        echo "Exporting XLISPPATH..."
        export XLISPPATH="$XLISPPATH"
    else
        echo "Invalid path. The nyquist folder does not exist in the specified path."
        get_xlisp_path
    fi
}

# Function to update or add a variable in the config file
update_config() {
    local VAR_NAME=$1
    local VAR_VALUE="$2"

    # Check if the variable already exists in the file
    if grep -q "^${VAR_NAME}=" "$PATH_FILE"; then
        # Variable exists, update its value
        sed -i "" "s|^${VAR_NAME}=.*$|${VAR_NAME}=\"${VAR_VALUE}\"|" "$PATH_FILE"
    else
        # Variable does not exist, add it
        echo "${VAR_NAME}=\"${VAR_VALUE}\"" >> "$PATH_FILE"
    fi
}

# Path to the file where the XLISPPATH will be saved
dir_path="$(realpath "$(dirname "$0")")"
PATH_FILE="$dir_path/config.cfg"
XLISPPATH=""
PIPE_FILE=/tmp/control_editor_pipe

# Check if the path file exists
if [[ -f "$PATH_FILE" ]]; then
    source "$PATH_FILE"

    # Check if USER_NYQUIST_FILE_PATH is unset or empty
    if [ -z "$USER_NYQUIST_FILE_PATH" ]; then
        echo "USER_NYQUIST_FILE_PATH is not set. Please enter a file to your nyquist folder to proceed."

        echo "Creating Pipe..."
        if [[ ! -p "$PIPE_FILE" ]]; then
            echo "Waiting for pipe to be created..."
            while [[ ! -p "$PIPE_FILE" ]]; do
                sleep 1
            done
        fi

        get_xlisp_path
        echo XLISPPATH set to "$XLISPPATH"
        echo "Exported XLISPPATH" > "$PIPE_FILE"
    else
        # Read the path from the file and set the XLISPPATH variable
        echo $USER_NYQUIST_FILE_PATH
        nyquist_folder="${USER_NYQUIST_FILE_PATH%%:*}"
        if [[ ! -d "$(dirname "$nyquist_folder")" ]]; then
            echo "The nyquist folder does not exist in the specified path."
            get_xlisp_path
            echo "Exported XLISPPATH" > "$PIPE_FILE"
        else
            read -p "Is this the correct path? (yes/y/no/n) " -r input
            input=$(echo "$input" | tr '[:upper:]' '[:lower:]')
            if [[ "$input" == "yes" || "$input" == "y" ]]; then
                export XLISPPATH="$USER_NYQUIST_FILE_PATH"
                echo XLISPPATH set to "$XLISPPATH"
            else
                echo "Issue with nyquist path. Reset your Nyquist folder path..."

                if [[ ! -p "$PIPE_FILE" ]]; then
                    echo "Waiting for pipe to be created..."
                    while [[ ! -p "$PIPE_FILE" ]]; do
                        sleep 1
                    done
                fi

                get_xlisp_path
            fi
            echo "Exported XLISPPATH" > "$PIPE_FILE"
        fi
    fi
fi

clear
exit
