var RuntimeRootContainer = (function (_super) {
	class RuntimeRootContainer extends _super {
		childrenCreated() {
			_super.prototype.childrenCreated.call(this);
			this.stage.registerImplementation("eui.IAssetAdapter", new AssetAdapter());
		}
	}
	return RuntimeRootContainer;
})(eui.Group);
egret.registerClass(RuntimeRootContainer, "RuntimeRootContainer");
