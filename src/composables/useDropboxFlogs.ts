import { ref, Ref, watch } from "vue"
import { IFlog, deserializeEntries, serializeEntries } from "@/modules/Flog"
import { useDropboxFiles } from "@/composables/useDropboxFiles"

export interface IDropboxFlog extends IFlog {
    rev: string;
}

export interface IDropboxFlogs {
    // pass through from useDropboxFiles
    launchConnectFlow: () => void;
    // pass through from useDropboxFiles
    hasConnection: Ref<boolean>;
    // pass through from useDropboxFiles
    clearConnection: () => void;
    // map availableFiles from from useDropboxFiles to flogs
    availableFlogs: Ref<IDropboxFlog[]>;
    // makes use of loadFileContent from useDropboxFiles
    loadFlogEntries: (flog: IDropboxFlog) => void;
    // makes use of ... from useDropboxFiles
    saveFlogEntries: (flog: IDropboxFlog) => void;
}

const {
    launchConnectFlow,
    hasConnection,
    clearConnection: clearFileConnection,
    availableFiles,
    loadFileContent,
    saveFileContent,
} = useDropboxFiles()

const filePathToFlogUrl = (path: string): string => {
    return 'dropbox: ' + path
}

const flogUrlToFilePath = (url: string): string => {
    return url.replace(/^dropbox: /, '')
}

export const useDropboxFlogs = (): IDropboxFlogs => {

    const availableFlogs = ref([]);

    watch(
        availableFiles,
        (availableFiles, oldValue) => {
            const removed = !oldValue ? [] : oldValue
                .filter((file) => availableFiles && !availableFiles.includes(file))
                .map<IDropboxFlog>((file) => ({ url: filePathToFlogUrl(file.path) } as IDropboxFlog))
            const added = !availableFiles ? [] : availableFiles
                .filter((file) => oldValue && !oldValue.includes(file))
                .map<IDropboxFlog>((file) => ({ url: filePathToFlogUrl(file.path) } as IDropboxFlog))
            availableFlogs.value = availableFlogs.value
                .filter((flog) => !removed.includes(flog))
                .concat(added)
        },
        { immediate: true }
    )

    const loadFlogEntries = (flog: IDropboxFlog) => {
        console.log('loadFlogEntries flog', flog)
        loadFileContent(
            { path: flogUrlToFilePath(flog.url) },
            (result) => {
                flog.loadedEntries = deserializeEntries(result.content)
                flog.rev = result.rev;
            }
        )
    }

    const saveFlogEntries = (flog: IDropboxFlog) => {
        console.log('saveFlogEntries flog', flog)
        saveFileContent(
            {
                path: flogUrlToFilePath(flog.url),
                rev: flog.rev,
                content: serializeEntries(flog.loadedEntries)
            },
            () => { } // can parameterize so calling app gets notice once save is complete 
        )
    }

    const clearConnection = () => {
        clearFileConnection()
        availableFlogs.value = []
    }

    return {
        launchConnectFlow,
        hasConnection,
        clearConnection,
        availableFlogs,
        loadFlogEntries,
        saveFlogEntries,
    }
}
