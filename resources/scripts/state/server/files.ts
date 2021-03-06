import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import { action, Action, thunk, Thunk } from 'easy-peasy';
import { ServerStore } from '@/state/server/index';
import { cleanDirectoryPath } from '@/helpers';

export interface ServerFileStore {
    directory: string;
    contents: FileObject[];
    getDirectoryContents: Thunk<ServerFileStore, string, Record<string, unknown>, ServerStore, Promise<void>>;
    setContents: Action<ServerFileStore, FileObject[]>;
    pushFile: Action<ServerFileStore, FileObject>;
    removeFile: Action<ServerFileStore, string>;
    setDirectory: Action<ServerFileStore, string>;
}

const files: ServerFileStore = {
    directory: '/',
    contents: [],

    getDirectoryContents: thunk(async (actions, payload, { getStoreState }) => {
        const server = getStoreState().server.data;
        if (!server) {
            return;
        }

        const contents = await loadDirectory(server.uuid, cleanDirectoryPath(payload));

        actions.setDirectory(payload.length === 0 ? '/' : payload);
        actions.setContents(contents);
    }),

    setContents: action((state, payload) => {
        state.contents = payload;
    }),

    pushFile: action((state, payload) => {
        const matchIndex = state.contents.findIndex(file => file.uuid === payload.uuid);
        if (matchIndex < 0) {
            state.contents = state.contents.concat(payload);
            return;
        }

        state.contents[matchIndex] = payload;
    }),

    removeFile: action((state, payload) => {
        state.contents = state.contents.filter(file => file.uuid !== payload);
    }),

    setDirectory: action((state, payload) => {
        state.directory = cleanDirectoryPath(payload);
    }),
};

export default files;
