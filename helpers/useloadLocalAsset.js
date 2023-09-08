import * as React from "react";
import * as fs from "expo-file-system";

export const useloadLocalAsset = (localUri) => {
  const [fileContent, setFileContent] = React.useState("");
  React.useEffect(() => {
    async function loadAndReadAsset() {
      try {
        const content = await fs.readAsStringAsync(localUri);
        setFileContent(content);
      } catch (error) {
        console.error("Error reading the file", error);
      }
    }
    loadAndReadAsset();
  }, []);

  return fileContent;
};
