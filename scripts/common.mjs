export async function transformManifest(moduleFileString, env) {

    if (env.MANIFEST_URL) {
        moduleFileString.replace("#{MANIFEST}#", env.MANIFEST_URL);
    }


    if (env.PROJECT_URL) {
        moduleFileString.replace("#{URL}#", env.PROJECT_URL);
    }


    if (env.DOWNLOAD_URL) {
        moduleFileString.replace("#{DOWNLOAD}#", env.DOWNLOAD_URL);
    }

    if (env.VERSION) {
        moduleFileString.replace("#{VERSION}#", env.VERSION);
    }

    return moduleFileString;
};