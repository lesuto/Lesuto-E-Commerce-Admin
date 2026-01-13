#!/bin/bash

print_directory_contents() {
    local directory="$1"
    find "$directory" -type f | while read -r file_path; do
        echo "File: $file_path"
        if file --mime-encoding "$file_path" | grep -q "binary"; then
            echo "(Binary file, skipping content)"
        else
            cat "$file_path" || echo "(Error reading file: $?)"
        fi
        echo
        echo "--- End of file ---"
        echo
    done
}

# Usage: Replace with your directory path
print_directory_contents "./lesuto-ui"  # or '/marketplace' if absolute
