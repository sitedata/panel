import React, { createRef, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCopy,
    faEllipsisH,
    faFileDownload,
    faLevelUpAlt,
    faPencilAlt,
    faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';
import RenameFileModal from '@/components/server/files/RenameFileModal';
import { ServerContext } from '@/state/server';
import { join } from 'path';
import deleteFile from '@/api/server/files/deleteFile';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import copyFile from '@/api/server/files/copyFile';
import { httpErrorToHuman } from '@/api/http';
import Can from '@/components/elements/Can';
import getFileDownloadUrl from '@/api/server/files/getFileDownloadUrl';
import useServer from '@/plugins/useServer';
import useFlash from '@/plugins/useFlash';
import tw from 'twin.macro';
import Fade from '@/components/elements/Fade';

type ModalType = 'rename' | 'move';

export default ({ uuid }: { uuid: string }) => {
    const menu = createRef<HTMLDivElement>();
    const menuButton = createRef<HTMLDivElement>();
    const [ menuVisible, setMenuVisible ] = useState(false);
    const [ showSpinner, setShowSpinner ] = useState(false);
    const [ modal, setModal ] = useState<ModalType | null>(null);
    const [ posX, setPosX ] = useState(0);

    const server = useServer();
    const { addError, clearFlashes } = useFlash();

    const file = ServerContext.useStoreState(state => state.files.contents.find(file => file.uuid === uuid));
    const directory = ServerContext.useStoreState(state => state.files.directory);
    const { removeFile, getDirectoryContents } = ServerContext.useStoreActions(actions => actions.files);

    if (!file) {
        return null;
    }

    const windowListener = (e: MouseEvent) => {
        if (e.button === 2 || !menuVisible || !menu.current) {
            return;
        }

        if (e.target === menu.current || menu.current.contains(e.target as Node)) {
            return;
        }

        if (e.target !== menu.current && !menu.current.contains(e.target as Node)) {
            setMenuVisible(false);
        }
    };

    const doDeletion = () => {
        setShowSpinner(true);
        clearFlashes('files');
        deleteFile(server.uuid, join(directory, file.name))
            .then(() => removeFile(uuid))
            .catch(error => {
                console.error('Error while attempting to delete a file.', error);
                addError({ key: 'files', message: httpErrorToHuman(error) });
                setShowSpinner(false);
            });
    };

    const doCopy = () => {
        setShowSpinner(true);
        clearFlashes('files');
        copyFile(server.uuid, join(directory, file.name))
            .then(() => getDirectoryContents(directory))
            .catch(error => {
                console.error('Error while attempting to copy file.', error);
                addError({ key: 'files', message: httpErrorToHuman(error) });
                setShowSpinner(false);
            });
    };

    const doDownload = () => {
        setShowSpinner(true);
        clearFlashes('files');
        getFileDownloadUrl(server.uuid, join(directory, file.name))
            .then(url => {
                // @ts-ignore
                window.location = url;
            })
            .catch(error => {
                console.error(error);
                addError({ key: 'files', message: httpErrorToHuman(error) });
            })
            .then(() => setShowSpinner(false));
    };

    useEffect(() => {
        menuVisible
            ? document.addEventListener('click', windowListener)
            : document.removeEventListener('click', windowListener);

        if (menuVisible && menu.current) {
            menu.current.setAttribute(
                'style', `margin-top: -0.35rem; left: ${Math.round(posX - menu.current.clientWidth)}px`,
            );
        }
    }, [ menuVisible ]);

    useEffect(() => () => {
        document.removeEventListener('click', windowListener);
    }, []);

    return (
        <div key={`dropdown:${file.uuid}`}>
            <div
                ref={menuButton}
                css={tw`p-3 hover:text-white`}
                onClick={e => {
                    e.preventDefault();
                    if (!menuVisible) {
                        setPosX(e.clientX);
                    }
                    setModal(null);
                    setMenuVisible(!menuVisible);
                }}
            >
                <FontAwesomeIcon icon={faEllipsisH}/>
                <RenameFileModal
                    file={file}
                    visible={modal === 'rename' || modal === 'move'}
                    useMoveTerminology={modal === 'move'}
                    onDismissed={() => {
                        setModal(null);
                        setMenuVisible(false);
                    }}
                />
                <SpinnerOverlay visible={showSpinner} fixed size={'large'}/>
            </div>
            <Fade timeout={150} in={menuVisible} unmountOnExit classNames={'fade'}>
                <div
                    ref={menu}
                    onClick={e => {
                        e.stopPropagation();
                        setMenuVisible(false);
                    }}
                    css={tw`absolute bg-white p-2 rounded border border-neutral-700 shadow-lg text-neutral-500 min-w-48`}
                >
                    <Can action={'file.update'}>
                        <div
                            onClick={() => setModal('rename')}
                            css={tw`hover:text-neutral-700 p-2 flex items-center hover:bg-neutral-100 rounded`}
                        >
                            <FontAwesomeIcon icon={faPencilAlt} css={tw`text-xs`}/>
                            <span css={tw`ml-2`}>Rename</span>
                        </div>
                        <div
                            onClick={() => setModal('move')}
                            css={tw`hover:text-neutral-700 p-2 flex items-center hover:bg-neutral-100 rounded`}
                        >
                            <FontAwesomeIcon icon={faLevelUpAlt} css={tw`text-xs`}/>
                            <span css={tw`ml-2`}>Move</span>
                        </div>
                    </Can>
                    <Can action={'file.create'}>
                        <div
                            onClick={() => doCopy()}
                            css={tw`hover:text-neutral-700 p-2 flex items-center hover:bg-neutral-100 rounded`}
                        >
                            <FontAwesomeIcon icon={faCopy} css={tw`text-xs`}/>
                            <span css={tw`ml-2`}>Copy</span>
                        </div>
                    </Can>
                    <div
                        css={tw`hover:text-neutral-700 p-2 flex items-center hover:bg-neutral-100 rounded`}
                        onClick={() => doDownload()}
                    >
                        <FontAwesomeIcon icon={faFileDownload} css={tw`text-xs`}/>
                        <span css={tw`ml-2`}>Download</span>
                    </div>
                    <Can action={'file.delete'}>
                        <div
                            onClick={() => doDeletion()}
                            css={tw`hover:text-red-700 p-2 flex items-center hover:bg-red-100 rounded`}
                        >
                            <FontAwesomeIcon icon={faTrashAlt} css={tw`text-xs`}/>
                            <span css={tw`ml-2`}>Delete</span>
                        </div>
                    </Can>
                </div>
            </Fade>
        </div>
    );
};
