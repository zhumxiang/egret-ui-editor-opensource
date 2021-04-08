import { IParseCenter, ClassChangedEvent } from '../parser';
import { Emitter, Event } from 'egret/base/common/event';
import { IFileService, FileChangesEvent } from 'egret/platform/files/common/files';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { ClassNode } from '../../syntaxNodes';
import { IParserProcess } from './parseProcess';
import { createChildProcess } from 'egret/base/parts/ipc/node/ipcserver.cp';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import * as path from 'path';
import * as ts from 'typescript';
import { isArray } from 'egret/base/common/types';

/**
 * Ts解析中心，worker版本
 */
export class ParseCenterProcess implements IParseCenter {
	private readonly _onClassChanges: Emitter<ClassChangedEvent>;
	private childProcess: IParserProcess;
	private disposables: IDisposable[] = [];
	constructor(
		private propertiesPath: string,
		private uiLib: 'eui' | 'gui',
		@IFileService private fileService: IFileService,
		@IEgretProjectService private projectService: IEgretProjectService,
		@IWorkspaceService private workspaceService: IWorkspaceService
	) {
		this._onClassChanges = new Emitter<ClassChangedEvent>();
		this.childProcess = createChildProcess<IParserProcess>('egret/exts/exml-exts/exml/common/project/parsers/process/parseProcess.node.js',
			(messageId, data) => this.receive_handler(messageId, data));
		this.disposables.push(this.fileService.onFileChanges(e => this.fileChanged_handler(e)));
		this.disposables.push(this.projectService.onTsConfigChanged(e => this.ConfigChanged_handler()));
		this.disposables.push(this.projectService.onProjectConfigChanged(e => this.ConfigChanged_handler()));
	}


	private inited: boolean = false;
	private initPromise: Promise<void> = null;
	/**
	 * 初始化完成
	 */
	public init(): Promise<void> {
		if (this.inited) {
			return Promise.resolve(void 0);
		} else if (this.initPromise) {
			return this.initPromise;
		} else {
			const initPormise = this.doInit().then(() => {
				this.initPromise = null;
				this.inited = true;
			});
			this.initPromise = initPormise;
			return this.initPromise;
		}
	}
	private doInit(): Promise<void> {
		const propertiesPath = this.propertiesPath;
		const uiLib = this.uiLib;
		const workspace = this.workspaceService.getWorkspace().uri.fsPath;
		return this.childProcess.initProcess(propertiesPath, uiLib, workspace, this.getParseFolders());
	}

	private getParseFolders(): string[] {
		let folders: string[] = [];
		const workspace = this.workspaceService.getWorkspace().uri.fsPath;
		try {
			const tsConfigFile = path.join(workspace, '/tsconfig.json');
			const tsConfig = ts.readConfigFile(tsConfigFile, ts.sys.readFile);
			if(tsConfig.error){
				throw tsConfig.error;
			}
			const include = tsConfig.config['include'];
			if(include && isArray(include)) {
				for (const element of include) {
					folders.push(path.join(workspace, element));
				}
			} else {
				folders.push(path.join(workspace, 'src'));
				folders.push(path.join(workspace, 'libs'));
			}
			const editorInclude = tsConfig.config['uieditor.include'];
			if (editorInclude && isArray(editorInclude)) {
				for (const element of editorInclude) {
					folders.push(path.join(workspace, element));
				}
			}
			const editorExclude = tsConfig.config['uieditor.exclude'];
			if (editorExclude && isArray(editorExclude)) {
				for (const element of editorExclude) {
					let p = path.join(workspace, element);
					let index = folders.indexOf(p);
					if (index != -1) {
						folders.splice(index, 1);
					}
				}
			}
		} catch (error) {
			console.error(error);
		}
		const exmlRoot = this.projectService.projectModel.exmlRoot;
		for (const element of exmlRoot) {
			folders.push(path.join(workspace, element.fsPath));
		}
		return [... new Set(folders)];
	}

	private ConfigChanged_handler(): void {
		if (this.childProcess) {
			this.init().then(() => {
				if (this.childProcess) {
					this.childProcess.changeParseFolders(this.getParseFolders());
				}
			});
		}
	}

	private fileChanged_handler(e: FileChangesEvent): void {
		if (this.childProcess) {
			this.init().then(() => {
				if (this.childProcess) {
					this.childProcess.onFileChanged(e.changes);
				}
			});
		}
	}

	private receive_handler(messageId: string, data: any): void {
		if (messageId == 'classChanged') {
			this.onClassChanged(data);
		}
	}

	private onClassChanged(data: any): void {
		const classDataMap = data.classDataMap;
		const allSkins = data.allSkins;
		const skinClassNameToPath = data.skinClassNameToPath;

		const tempClassNodeMap: { [fullName: string]: { baseClass: string, classNode: ClassNode, implementeds: string[] } } = {};
		const classNodeMap: { [fullName: string]: ClassNode } = {};
		for (var fullName in classDataMap) {
			const classData = classDataMap[fullName];
			var classNode: ClassNode = new ClassNode();
			classNode.inEngine = classData['inEngine'];
			classNode.inPrompt = classData['inPrompt'];
			classNode.fullName = classData['fullName'];
			const baseClass: string = classData['baseClass'];
			const implementeds: string[] = classData['implementeds'];
			classNode.props = classData['props'];
			classNode.isInterface = classData['isInterface'];
			tempClassNodeMap[fullName] = {
				baseClass: baseClass,
				implementeds: implementeds,
				classNode: classNode
			};
		}
		for (var fullName in tempClassNodeMap) {
			var classNode = tempClassNodeMap[fullName].classNode;
			const baseClassName = tempClassNodeMap[fullName].baseClass;
			const implementedNames = tempClassNodeMap[fullName].implementeds;
			const baseClassNode = tempClassNodeMap[baseClassName] ? tempClassNodeMap[baseClassName].classNode : null;
			const implementedNodes: ClassNode[] = [];
			for (let i = 0; i < implementedNames.length; i++) {
				const implementedNode = tempClassNodeMap[implementedNames[i]] ? tempClassNodeMap[implementedNames[i]].classNode : null;
				if (implementedNode) {
					implementedNodes.push(implementedNode);
				}
			}
			classNode.baseClass = baseClassNode;
			classNode.implementeds = implementedNodes;
			classNodeMap[fullName] = classNode;
		}

		const event = new ClassChangedEvent();
		event.type = data.type,
			event.classMap = classNodeMap;
		event.skinNames = allSkins;
		event.skinToPathMap = skinClassNameToPath;
		this._onClassChanges.fire(event);
	}

	/**
	 * 类信息改变的时候
	 */
	public get onClassChanges(): Event<ClassChangedEvent> {
		return this._onClassChanges.event;
	}

	public dispose(): void {
		this.inited = false;
		dispose(this.disposables);
		if (this.childProcess) {
			this.childProcess.dispose();
			this.childProcess = null;
		}
	}
}