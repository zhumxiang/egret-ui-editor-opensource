import { BasePart } from '../../parts/basePart';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { addClass } from 'egret/base/common/dom';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { INode, IClass, isInstanceof, IValue } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { IUIBase } from 'egret/base/browser/ui/common';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { relative } from 'path';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

/**
 * 皮肤部分
 */
export class SkinPart extends BasePart {

	constructor(container: HTMLElement | IUIBase = null,
		@IEgretProjectService private egretProjectService: IEgretProjectService
	) {

		super(container);
	}
	private currentNode: INode = null;
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		this.currentNode = null;
		this.hide();
		if (!this.model) {
			return;
		}
		if (nodes.length != 1) {
			return;
		}
		const node = nodes[0];
		if (
			this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.DataGroup') ||
			this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Component')
		) {
			this.currentNode = node;
			this.show();
			if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.DataGroup')) {
				this.hasItemSkin = true;
			} else {
				this.hasItemSkin = false;
			}

			this.getSkinList().then(datas => {
				this.skinCombobox.setDatas(datas);
				let skinNameValue: IClass | IValue = null;
				let skinNameDefault: any = null;
				if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.DataGroup')) {
					skinNameValue = node.getProperty('itemRendererSkinName') as IClass;
					skinNameDefault = node.getInstance()['itemRendererSkinName'];
				} else {
					skinNameValue = node.getProperty('skinName') as IClass;
					skinNameDefault = node.getInstance()['skinName'];
				}

				let skinNameValueUser: string = '';
				if (skinNameValue && isInstanceof(skinNameValue, 'eui.IClass')) {
					if (!(skinNameValue as IClass).getIsInner()) {
						skinNameValueUser = (skinNameValue as IClass).getClassName();
					}
				} else if (skinNameValue && isInstanceof(skinNameValue, 'eui.IValue')) {
					skinNameValueUser = skinNameValue.getInstance() as string;
				}
				let skinNameValueDefault: string = '';
				if (typeof skinNameDefault == 'string') {
					skinNameValueDefault = skinNameDefault;
				} else if (typeof skinNameDefault == 'function') {
					skinNameValueDefault = skinNameDefault['name'];
				} else {
					//TODO
					console.log('皮肤获取失败');
				}
				this.skinCombobox.prompt = skinNameValueDefault;

				if (skinNameValueUser) {
					this.skinCombobox.setSelection(skinNameValueUser);
				} else {
					this.skinCombobox.setSelection('');
				}
			});

			if (this.hasItemSkin) {
				this.getItemRendererList().then(datas => {
					this.itemClassCombobox.setDatas(datas);
					let itemNameValue: IClass | IValue = null;
					let itemNameDefault: any = null;
					itemNameValue = node.getProperty('itemRenderer') as IClass;
					itemNameDefault = node.getInstance()['itemRenderer'];

					let itemNameValueUser: string = '';
					if (itemNameValue) {
						itemNameValueUser = (itemNameValue as IClass).getClassName();
					}
					let itemNameValueDefault: string = '';
					if (itemNameDefault) {
						itemNameValueDefault = itemNameDefault.prototype.__class__;
					}
					this.itemClassCombobox.prompt = itemNameValueDefault;

					if (itemNameValueUser) {
						this.itemClassCombobox.setSelection(itemNameValueUser);
					} else {
						this.itemClassCombobox.setSelection('');
					}
				});
			}

		} else {
			return;
		}

		this.updateAttributeLabelDisplay();
	}

	/**
	 * 皮肤列表
	 */
	public getSkinList(): Promise<IDropDownTextDataSource[]> {
		return this.egretProjectService.ensureLoaded().then(() => {
			return this.egretProjectService.exmlConfig.ensureLoaded().then(() => {
				const list = this.egretProjectService.exmlConfig.getSkinNames();
				const arr: string[] = [];
				for (var i = 0; i < list.length; i++) {
					arr.push(list[i]);
				}
				const pathObj = this.model.getExmlConfig().getProjectConfig()['classNameToPath'];

				let paths: string;
				for (const key in pathObj) {
					paths = pathObj[key];
					if (paths.indexOf('.exml') !== -1) {
						paths = relative(this.egretProjectService.projectModel.project.fsPath, paths).replace(/\\/ig, '/');
						arr.push(paths);
					}
				}
				const reuslt: IDropDownTextDataSource[] = [];
				for (var i = 0; i < arr.length; i++) {
					reuslt.push({ id: arr[i], data: arr[i] });
				}
				return reuslt;
			});
		});
	}


	/**
	 * eui.IItemRenderer列表
	 */
	public getItemRendererList(): Promise<IDropDownTextDataSource[]> {
		return this.egretProjectService.ensureLoaded().then(() => {
			return this.egretProjectService.exmlConfig.ensureLoaded().then(() => {
				const list = this.egretProjectService.exmlConfig.getItemRendererNames();
				const reuslt: IDropDownTextDataSource[] = [];
				for (var i = 0; i < list.length; i++) {
					reuslt.push({ id: list[i], data: list[i] });
				}
				return reuslt;
			});
		});
	}

	private skinCombobox = new ComboBox();
	private skinAttribute: AttributeItemGroup = new AttributeItemGroup();
	private itemClassCombobox = new ComboBox();
	private itemClassAttribute: AttributeItemGroup = new AttributeItemGroup();
	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.style.title.skin', 'Skin');
		line.style.marginBottom = '6px';

		this.itemClassAttribute.create(container);
		this.itemClassCombobox.create(this.itemClassAttribute);
		this.initAttributeStyle(this.itemClassAttribute);
		this.toDisposes.push(this.itemClassCombobox.onSelectChanged(t => this.itemClassChanged_handler(t.getSelection())));

		this.skinAttribute.create(container);
		this.skinCombobox.create(this.skinAttribute);
		this.initAttributeStyle(this.skinAttribute);
		this.toDisposes.push(this.skinCombobox.onSelectChanged(t => this.skinChanged_handler(t.getSelection())));
		this.updateAttributeLabelDisplay();
	}

	private hasItemSkin: boolean = false;
	private updateAttributeLabelDisplay(): void {
		if (this.hasItemSkin) {
			this.skinAttribute.label = localize('property.style.skin.itemSkinName', 'Item Skin:');
			this.itemClassAttribute.label = localize('property.style.skin.itemClassName', 'Item Skin:');
			this.itemClassAttribute.style.display = 'flex';
		} else {
			this.skinAttribute.label = localize('property.style.skin.skinName', 'Skin:');
			this.itemClassAttribute.style.display = 'none';
		}
	}


	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	private skinChanged_handler(value: IDropDownTextDataSource): void {
		if (!this.currentNode) {
			return;
		}

		if (this.model.getExmlConfig().isInstance(this.currentNode.getInstance(), 'eui.DataGroup')) {
			if (!value) {
				this.currentNode.setClass('itemRendererSkinName', null);
			} else {
				this.currentNode.setClass('itemRendererSkinName', value.id);
			}
		} else if (this.model.getExmlConfig().isInstance(this.currentNode.getInstance(), 'eui.Component')) {
			if (!value) {
				this.currentNode.setClass('skinName', null);
			} else {
				this.currentNode.setClass('skinName', value.id);
			}
		}
	}

	private itemClassChanged_handler(value: IDropDownTextDataSource): void {
		if (!this.currentNode) {
			return;
		}

		if (!value) {
			this.currentNode.setClass('itemRenderer', null);
		} else {
			this.currentNode.setClass('itemRenderer', value.id);
		}
	}
}