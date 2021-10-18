import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IModelRequirePart, IExmlModelServices } from 'egret/exts/exml-exts/models';
import { IFocusablePart } from 'egret/platform/operations/common/operations';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { IPanel } from 'egret/parts/common/panel';
import { localize } from 'egret/base/localization/nls';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { Tabbar } from 'egret/base/browser/ui/tabbars';
import { addClass } from 'egret/base/common/dom';
import { DomScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollbarVisibility } from 'vs/base/common/scrollable';
import { AccordionGroup, DataSource } from 'egret/base/browser/ui/accordionGroup';
import { PropertyGeneralPart } from './property-general/propertyGeneralPart';
import { PropertyStylePart } from './property-style/propertyStylePart';
import { PropertySizeposPart } from './property-sizepos/propertySizeposPart';
import { PropertyLayoutPart } from './property-layout/propertyLayoutPart';
import { SelectionDisplay } from './parts/selectionsDisplay';
import { AutoRefreshHelper } from '../../common/autoRefreshers';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { PropertyAllPart } from './property-all/propertyAllPart';
import { PropertyNormalPart } from './property-animation/propertyNormalPart';
import { PropertyFramePart } from './property-animation/propertyFramePart';
import { IAnimationService } from 'egret/workbench/parts/animation/common/animation';

import './media/propertyView.css';


/**
 * 属性面板
 */
export class PropertyView extends PanelContentDom implements IModelRequirePart, IFocusablePart {

	private toDisposes: IDisposable[] = [];

	private refreshHelper: AutoRefreshHelper;
	/**
	 * 初始化
	 * @param instantiationService
	 */
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IExmlModelServices private exmlModeService: IExmlModelServices,
		@IAnimationService private animationService: IAnimationService
	) {
		super();
		this.refreshHelper = new AutoRefreshHelper(['class']);
		this.initListeners();
		setTimeout(() => {
			this.exmlModeService.registerPart(this);
		}, 1);
	}

	private initListeners(): void {
		this.toDisposes.push(this.refreshHelper.onChanged(e => this.refreshChanged_handler(e)));
		this.toDisposes.push(this.animationService.onDidEnableChange(e => this.animationEnableChanged_handler(e)));
	}

	private inited: boolean = false;
	private refreshChanged_handler(nodes: INode[]): void {
		this.selectionDisplay.selectedNodes = nodes;
		if (!this.inited && nodes.length > 0) {
			this.commonAccordionGroup.open();
			this.animationAccordionGroup.open();
			this.inited = true;
		}
	}

	private animationEnableChanged_handler(value: boolean): void {
		this.updateMode();
	}

	private updateMode(): void {	
		const animationMode = this.animationService.animation && this.animationService.animation.getEnabled();
		if (animationMode) {
			this.tabbar.setItemVisible(0, false);
			this.tabbar.setItemVisible(1, false);
			this.tabbar.setItemVisible(2, true);
		} else {
			this.tabbar.setItemVisible(0, true);
			this.tabbar.setItemVisible(1, true);
			this.tabbar.setItemVisible(2, false);
		}
	}

	private owner: IPanel;
	/**
	 * 初始化所有者
	 */
	public initOwner(owner: IPanel): void {
		this.owner = owner;
		this.initCommands();
	}

	/** 
	 * 注册当前编辑器可以执行的命令 
	 */
	private initCommands(): void {

	}

	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return this.owner.getRoot();
	}
	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<T> {
		return Promise.resolve(void 0);
	}
	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return false;
	}

	private rootContainer: HTMLElement;
	private tabbar: Tabbar;

	private selectionDisplay: SelectionDisplay;

	private commonScroller: DomScrollableElement;
	private commonContainer: HTMLElement;

	private allScroller: DomScrollableElement;
	private allContainer: HTMLElement;

	private animationScroller: DomScrollableElement;
	private animationContainer: HTMLElement;

	/**
	 * 渲染
	 * @param container 
	 */
	public render(container: HTMLElement) {
		this.rootContainer = document.createElement('div');
		container.appendChild(this.rootContainer);
		addClass(this.rootContainer, 'property-container');

		this.tabbar = new Tabbar(this.rootContainer);
		this.tabbar.dataProvider = [
			{ iconClass: '', label: localize('propertyView.initTab.classify', 'Common'), id: 'common', style: 'tab-item', size: 25 },
			{ iconClass: '', label: localize('propertyView.initTab.all', 'All'), id: 'all', style: 'tab-item', size: 25 },
			{ iconClass: '', label: localize('propertyView.initTab.animation', 'Animation'), id: 'animation', style: 'tab-item', size: 25 }
		];
		addClass(this.tabbar.getElement(), 'property-tabbar');
		this.tabbar.onSelectedChanged(() => this.tabbarChanged_handler());

		this.selectionDisplay = new SelectionDisplay(this.rootContainer);

		const contentGroup = document.createElement('div');
		addClass(contentGroup, 'property-content-container');
		this.rootContainer.appendChild(contentGroup);

		this.commonContainer = document.createElement('div');
		addClass(this.commonContainer, 'propertie-kind-container common');
		this.allContainer = document.createElement('div');
		addClass(this.allContainer, 'propertie-kind-container all');
		this.animationContainer = document.createElement('div');
		addClass(this.animationContainer, 'propertie-kind-container animation');

		this.commonScroller = this.instantiationService.createInstance(DomScrollableElement, this.commonContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Hidden,
			vertical: ScrollbarVisibility.Auto,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6
		});

		this.allScroller = this.instantiationService.createInstance(DomScrollableElement, this.allContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Hidden,
			vertical: ScrollbarVisibility.Auto,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6
		});

		this.animationScroller = this.instantiationService.createInstance(DomScrollableElement, this.animationContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Hidden,
			vertical: ScrollbarVisibility.Auto,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6
		});

		contentGroup.appendChild(this.commonScroller.getDomNode());
		this.commonScroller.getDomNode().style.flexGrow = '1';
		contentGroup.appendChild(this.allScroller.getDomNode());
		this.allScroller.getDomNode().style.flexGrow = '1';
		contentGroup.appendChild(this.animationScroller.getDomNode());
		this.animationScroller.getDomNode().style.flexGrow = '1';

		this.initCommonProperties(this.commonContainer);
		this.initAllProperties(this.allContainer);
		this.initAnimationProperties(this.animationContainer);

		this.tabbarChanged_handler();
		this.refreshScroller();
		this.updateMode();
	}
	/**
	 * 布局刷新
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {
		this.commonAccordionGroup.layout();
		this.animationAccordionGroup.layout();
		this.refreshScroller();
	}
	/**
	 * tab当前选择项改变
	 */
	private tabbarChanged_handler(): void {
		if (this.tabbar.selection.id == 'common') {
			this.commonScroller.getDomNode().style.display = '';
			this.allScroller.getDomNode().style.display = 'none';
			this.animationScroller.getDomNode().style.display = 'none';
		} else if(this.tabbar.selection.id === 'all') {
			this.commonScroller.getDomNode().style.display = 'none';
			this.animationScroller.getDomNode().style.display = 'none';
			this.allScroller.getDomNode().style.display = '';
		} else if(this.tabbar.selection.id === 'animation') {
			this.animationScroller.getDomNode().style.display = '';
			this.allScroller.getDomNode().style.display = 'none';
			this.commonScroller.getDomNode().style.display = 'none';
		}
		this.commonAccordionGroup.layout();
		this.animationAccordionGroup.layout();
		this.refreshScroller();
	}

	private refreshScroller(): void {
		setTimeout(() => {
			if (this.allScroller) {
				this.allScroller.scanDomNode();
			}
			if (this.commonScroller) {
				this.commonScroller.scanDomNode();
			}
			if (this.animationScroller) {
				this.animationScroller.scanDomNode();
			}
		}, 1);
	}

	private commonAccordionGroup: AccordionGroup;
	private propertyGeneralPart: PropertyGeneralPart;
	private propertyStylePart: PropertyStylePart;
	private propertySizeposPart: PropertySizeposPart;
	private propertyLayoutPart: PropertyLayoutPart;
	private propertyAllPart: PropertyAllPart;

	private initCommonProperties(container: HTMLElement): void {
		this.commonAccordionGroup = new AccordionGroup(container);

		this.propertyGeneralPart = this.instantiationService.createInstance(PropertyGeneralPart, this.commonAccordionGroup);
		this.propertyStylePart = this.instantiationService.createInstance(PropertyStylePart, this.commonAccordionGroup);
		this.propertySizeposPart = this.instantiationService.createInstance(PropertySizeposPart, this.commonAccordionGroup);
		this.propertyLayoutPart = this.instantiationService.createInstance(PropertyLayoutPart, this.commonAccordionGroup);
		const dataProvider: DataSource[] = [
			this.propertyGeneralPart,
			this.propertyStylePart,
			this.propertySizeposPart,
			this.propertyLayoutPart
		];
		this.commonAccordionGroup.dataProvider = dataProvider;
		this.commonAccordionGroup.onResize(() => this.refreshScroller());
	}

	private initAllProperties(container: HTMLElement): void {
		this.propertyAllPart = this.instantiationService.createInstance(PropertyAllPart, null);
		this.propertyAllPart.create(container);
		this.propertyAllPart.onChanged(() => this.refreshScroller());
	}

	private animationAccordionGroup: AccordionGroup;
	private propertyNormalPart: PropertyNormalPart;
	private propertyFramePart: PropertyFramePart;
	private initAnimationProperties(container: HTMLElement): void {
		this.animationAccordionGroup = new AccordionGroup(container);

		this.propertyNormalPart = this.instantiationService.createInstance(PropertyNormalPart, this.animationAccordionGroup);
		this.propertyFramePart = this.instantiationService.createInstance(PropertyFramePart, this.animationAccordionGroup);
		const dataProvider: DataSource[] = [
			this.propertyNormalPart,
			this.propertyFramePart
		];
		this.animationAccordionGroup.dataProvider = dataProvider;
		this.animationAccordionGroup.onResize(() => this.refreshScroller());
	}

	/**
	 * 设置一个ExmlModel
	 * @param exmlModel 
	 */
	public setModel(exmlModel: IExmlModel): void {
		this.refreshHelper.model = exmlModel;
		this.propertyGeneralPart.model = exmlModel;
		this.propertyStylePart.model = exmlModel;
		this.propertySizeposPart.model = exmlModel;
		this.propertyLayoutPart.model = exmlModel;
		this.propertyAllPart.model = exmlModel;
		this.propertyFramePart.model = exmlModel;
		this.propertyNormalPart.model = exmlModel;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		this.exmlModeService.unregisterPart(this);
		dispose(this.toDisposes);

		this.instantiationService = null;
		this.exmlModeService = null;
	}
}


export namespace PropertyView {
	export const ID: string = 'workbench.property';
	export const TITLE: string = localize('propertyView.title', 'Property');
}