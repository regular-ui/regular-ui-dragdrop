import Draggable from '../draggable';
import manager from '../manager';

/**
 * @class Dragger
 * @extend Draggable
 * @param {object}                  options.data                     =  绑定属性
 * @param {string='both'}           options.data.axis                => 拖拽代理移动时限制的轴向，`both`表示可以在任意方向上移动，`horizontal`表示限制在水平方向上移动，`vertical`表示限制在垂直方向上移动
 * @param {boolean=false}           options.data.disabled            => 是否禁用
 * @param {string='z-draggable'}    options.data.class               => 可拖拽时（即disabled=false）给元素附加此class
 * @param {string='z-drag'}         options.data.dragClass           => 拖拽该元素时给元素附加此class
 */
let Dragger = Draggable.extend({
    name: 'dragger',
    template: '{#inc this.$body}',
    /**
     * @protected
     * @override
     */
    config() {
        this.data = Object.assign({
            proxy: 'self',
            // value: undefined,
            // 'class': 'z-draggable',
            // sourceClass: 'z-dragSource',
            // proxyClass: 'z-dragProxy'
            range: undefined,
            rangeMode: 'inside',
            axis: 'both',
            // grid
            // snap
        }, this.data);
        this.supr();
    },
    /**
     * @method _getRange(proxy) 获取拖拽范围
     * @private
     * @return {Element} 拖拽范围元素
     */
    _getRange(proxy) {
        let range;
        if(this.data.range === 'parent')
            range = proxy.parentElement;

        if(range instanceof Element) {
            if(proxy.offsetParent === range) {
                range = {left: 0, top: 0, right: range.offsetWidth, bottom: range.offsetHeight};
            }
        }

        return range;
    },
    /**
     * @protected
     * @override
     */
    _onMouseMoveStart: function(e) {
        this.supr(e);
        manager.range = this._getRange(manager.proxy);
    },
    /**
     * @protected
     * @override
     */
    restrict(params) {
        let next = this.supr(params);

        if(params.range) {
            if(this.data.rangeMode === 'none') {
                next.left = Math.min(Math.max(params.range.left, next.left), params.range.right);
                next.top = Math.min(Math.max(params.range.top, next.top), params.range.bottom);
            }
        }

        if(this.data.axis === 'vertical')
            next.left = params.startLeft;
        if(this.data.axis === 'horizontal')
            next.top = params.startTop;

        return next;
    }
});

export default Dragger;
