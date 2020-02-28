const fs = require('fs');
const path = require('path');
var parser = require('fast-xml-parser');
const { promisify } = require('util');

// Promisify 'fs' methods
const exists = promisify(fs.exists);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const projectDirectory = process.argv[2];

function isDirectory(pathname) {
    return fs.lstatSync(pathname).isDirectory();
}

function isFile(pathname) {
    return fs.lstatSync(pathname).isFile();
}

function validateName(name) {
    const namePattern = /^([a-zA-Z]([a-zA-Z]|_|\.|[0-9])*)$/;
    return namePattern.test(name);
} 

function recursiveValidation(jsonObject) {
    try {
        if (jsonObject === undefined || jsonObject === null) {
            return;
        } else if (jsonObject['@_name'] !== undefined) {
            if (!validateName(jsonObject['@_name'])) {
                console.log(` -> Invalid identifier found: ${jsonObject['@_name']}`);
            }
            return;
        } else if (typeof jsonObject === 'object') {
            for (item in jsonObject) {
                if (item !== '__proto__') {
                    recursiveValidation(jsonObject[item]);
                }
            }
        }
    } catch (err) {
        // Ignore errors...
    }
}


;(async () => {
    if (projectDirectory === undefined) {
        console.log('Please, specify a valid project directory in order to proceed with the validation of the names');
        process.exit(0);
    }
    if (await exists(projectDirectory) && isDirectory(projectDirectory)) {
        for (firstLevelFile of await readdir(projectDirectory)) {
            const currentFile = path.join(projectDirectory, firstLevelFile);
            if (isDirectory(currentFile)) {
                const sourceDirectory = path.join(currentFile, 'src');
                if (await exists(sourceDirectory)) {
                    for (sourceFile of await readdir(sourceDirectory)) {
                        const resourcesRootDirectory = path.join(sourceDirectory, sourceFile, 'res');
                        if (await exists(resourcesRootDirectory)) {
                            for (resourceType of await readdir(resourcesRootDirectory)) {
                                const resourceTypeDirectory = path.join(resourcesRootDirectory, resourceType);
                                if (isDirectory(resourceTypeDirectory)) {
                                    for (resourceFile of await readdir(resourceTypeDirectory)) {
                                        const resourcePath = path.join(resourceTypeDirectory, resourceFile);
                                        if (isFile(resourcePath) && path.extname(resourcePath).toLowerCase() === '.xml') {
                                            const fileContent = await readFile(resourcePath, 'utf8');
                                            const jsonFile = parser.parse(fileContent, { ignoreAttributes: false }); 
                                            //console.log(`Analizing ${resourcePath}...`);
                                            recursiveValidation(jsonFile);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        console.log(`Specified path doesn't exists nor is a directory (current path '${projectDirectory}').\nPlease provide a valid directory path.`);
    }
})()
.then(() => {
	console.log('Job done!');
})
.catch((err) => {
	console.log(`Something went wrong: ${err}`)
})
