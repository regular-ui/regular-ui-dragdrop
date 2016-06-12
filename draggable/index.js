import {Component, _} from 'rgui-base';
import manager from '../manager';

/**
 * @class Draggable
 * @extend Component
 * @param {object}                  options.data                     =  绑定属性
 * @param {string|Dragable.Proxy|Element|function='clone'}  options.data.proxy  @=> 拖拽代理，即拖拽时移动的元素。默认值为`clone`，拖拽时拖起自身的一个拷贝；当值为`self`，拖拽时直接拖起自身。也可以用`<draggable.proxy>`自定义代理，或直接传入一个元素或函数。其他值表示不使用拖拽代理。
 * @param {var}                     options.data.value               => 拖拽时需要传递的值
 * @param {boolean=false}           options.data.disabled            => 是否禁用
 * @param {string='z-draggable'}    options.data.class               => 可拖拽时（即disabled=false）给元素附加此class
 * @param {string='z-drag'}         options.data.dragClass           => 拖拽该元素时给元素附加此class
 */
let Draggable = Component.extend({
    name: 'draggable',
    template: '{#inc this.$body}',
    /**
     * @protected
     * @override
     */
    config() {
        this.data = Object.assign({
            proxy: 'clone',
            value: undefined,
            'class': 'z-draggable',
            sourceClass: 'z-dragSource',
            proxyClass: 'z-dragProxy'
        }, this.data);
        this.supr();

        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this.cancel = this.cancel.bind(this);
    },
    /**
     * @protected
     * @override
     */
    init() {
        let inner = _.dom.element(this);
        _.dom.on(inner, 'mousedown', this._onMouseDown);
        this.supr();

        this.$watch('disabled', (newValue) =>
            _.dom[newValue ? 'delClass' : 'addClass'](inner, this.data['class']));
    },
    /**
     * @method _getProxy() 获取拖拽代理
     * @private
     * @return {Element} 拖拽代理元素
     */
    _getProxy() {
        let proxy;
        let source = _.dom.element(this);

        if(typeof this.data.proxy === 'function')
            proxy = this.data.proxy();
        else if(this.data.proxy instanceof Element)
            proxy = this.data.proxy;
        else if(this.data.proxy === 'self')
            proxy = source;
        else if(this.data.proxy === 'clone') {
            proxy = source.cloneNode(true);
            this._setProxyFixed(proxy, _.dom.getPosition(source));
            let size = _.dom.getSize(source);
            proxy.style.width = size.width + 'px';
            proxy.style.height = size.height + 'px';
            source.parentElement.appendChild(proxy);
        } else if(this.data.proxy instanceof Draggable.Proxy) {
            proxy = _.dom.element(this.data.proxy.$body());
            this._setProxyFixed(proxy, _.dom.getPosition(source));
            document.body.appendChild(proxy);
        }

        this._initProxy(proxy);
        return proxy;
    },
    /**
     * @method _setProxyFixed() 将拖拽代理的position设置fixed并设置初始位置
     * @param  {Element} proxy 拖拽代理元素
     * @param  {position=...} position 拖拽代理的初始位置
     * @private
     * @return {void}
     */
    _setProxyFixed(proxy, position = {left: 0, top: 0}) {
        proxy.style.left = position.left + 'px';
        proxy.style.top = position.top + 'px';
        proxy.style.zIndex = '2000';
        proxy.style.position = 'fixed';
        proxy.style.display = '';
    },
    /**
     * @method _initProxy() 初始化拖拽代理
     * @private
     * @return {void}
     */
    _initProxy(proxy) {
        // 如果position为static，则设置为relative，保证可以移动
        let computedStyle = proxy.currentStyle || window.getComputedStyle(proxy, null);
        if(computedStyle.position === 'static')
            proxy.style.position = 'relative';
    },
    /**
     * @private
     */
    _onMouseDown($event) {
        if(this.data.disabled)
            return;

        _.dom.on(window, 'mousemove', this._onMouseMove);
        _.dom.on(window, 'mouseup', this._onMouseUp);
    },
    /**
     * @private
     */
    _onMouseMove($event) {
        let e = $event.event;
        $event.preventDefault();

        if(manager.dragging === false)
            this._onMouseMoveStart(e);
        else
            this._onMouseMoving(e);
    },
    /**
     * @method _onMouseMoveStart(e) 处理第一次鼠标移动事件
     * @private
     * @param  {MouseEvent} e 鼠标事件
     * @return {void}
     */
    _onMouseMoveStart: function(e) {
        let proxy = this._getProxy();

        // 获取初始的left和top值
        let computedStyle = proxy.currentStyle || window.getComputedStyle(proxy, null);
        if(!computedStyle.left || computedStyle.left === 'auto')
            computedStyle.left = '0px';
        if(!computedStyle.top || computedStyle.top === 'auto')
            computedStyle.top = '0px';

        Object.assign(manager, {
            dragging: true,
            proxy,
            value: this.data.value,
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            startX: e.clientX,
            startY: e.clientY,
            dragX: 0,
            dragY: 0,
            startLeft: +computedStyle.left.slice(0, -2),
            startTop: +computedStyle.top.slice(0, -2),
            droppable: undefined
        });

        this._dragStart();
    },
    /**
     * @method _onMouseMoveStart(e) 处理后续鼠标移动事件
     * @param  {MouseEvent} e 鼠标事件
     * @private
     * @return {void}
     */
    _onMouseMoving: function(e) {
        Object.assign(manager, {
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            dragX: e.clientX - manager.startX,
            dragY: e.clientY - manager.startY
        });

        // 拖拽约束
        let next = this.restrict(manager);
        // 设置位置
        manager.proxy.style.left = next.left + 'px';
        manager.proxy.style.top = next.top + 'px';

        this._drag();
        if(!manager.dragging)
            return;

        // for Droppable
        let pointElement = null;
        if(manager.proxy) {
            manager.proxy.style.display = 'none';
            pointElement = document.elementFromPoint(e.clientX, e.clientY);
            manager.proxy.style.display = '';
        } else
            pointElement = document.elementFromPoint(e.clientX, e.clientY);

        let pointDroppable = null;
        while(pointElement) {
            pointDroppable = manager.droppables.find((droppable) =>
                _.dom.element(droppable) === pointElement);

            if(pointDroppable)
                break;
            else
                pointElement = pointElement.parentElement;
        }

        if(manager.droppable !== pointDroppable) {
            manager.droppable && manager.droppable._dragLeave(this);
            if(!manager.dragging)
                return;
            pointDroppable && pointDroppable._dragEnter(this);
            if(!manager.dragging)
                return;
            manager.droppable = pointDroppable;
        }

        // dragEnter之后也要dragOver
        pointDroppable && pointDroppable._dragOver(this);
    },
    /**
     * @method restrict(manager) 拖拽约束函数
     * @protected
     * @param  {params} 拖拽参数
     * @return {left, top} 拖拽代理元素计算后的left和top位置
     */
    restrict(params) {
        return {
            left: params.startLeft + params.dragX,
            top: params.startTop + params.dragY,
        };
    },
    /**
     * @private
     */
    _onMouseUp($event) {
        let e = $event.event;
        $event.preventDefault();

        manager.droppable && manager.droppable._drop(this);
        this.cancel();
    },
    /**
     * @method cancel() 取消拖拽操作
     * @public
     * @return {void}
     */
    cancel() {
        this._dragEnd();

        Object.assign(manager, {
            dragging: false,
            value: undefined,
            proxy: undefined,
            range: undefined,
            screenX: 0,
            screenY: 0,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            startX: 0,
            startY: 0,
            dragX: 0,
            dragY: 0,
            startLeft: 0,
            startTop: 0,
            dragLeft: 0,
            dragTop: 0,
            droppable: undefined
        });

        _.dom.off(window, 'mousemove', this._onMouseMove);
        _.dom.off(window, 'mouseup', this._onMouseUp);
    },
    /**
     * @private
     */
    _dragStart() {
        let source = _.dom.element(this);
        _.dom.addClass(source, this.data.sourceClass);
        _.dom.addClass(manager.proxy, this.data.proxyClass);

        /**
         * @event dragstart 拖拽开始时触发
         * @property {object} sender 事件发送对象，为当前draggable
         * @property {object} origin 拖拽源，为当前draggable
         * @property {object} source 拖拽起始元素
         * @property {object} proxy 拖拽代理元素
         * @property {var} value 拖拽时需要传递的值
         * @property {number} screenX 鼠标指针相对于屏幕的水平位置
         * @property {number} screenY 鼠标指针相对于屏幕的垂直位置
         * @property {number} clientX 鼠标指针相对于浏览器的水平位置
         * @property {number} clientY 鼠标指针相对于浏览器的垂直位置
         * @property {number} pageX 鼠标指针相对于页面的水平位置
         * @property {number} pageY 鼠标指针相对于页面的垂直位置
         * @property {number} movementX 鼠标指针水平位置相对于上次操作的偏移量
         * @property {number} movementY 鼠标指针垂直位置相对于上次操作的偏移量
         * @property {function} cancel 取消拖拽操作
         */
        this.$emit('dragstart', Object.assign({
            sender: this,
            origin: this,
            source,
            cancel: this.cancel
        }, manager));
    },
    /**
     * @private
     */
    _drag() {
        /**
         * @event drag 正在拖拽时触发
         * @property {object} sender 事件发送对象，为当前draggable
         * @property {object} origin 拖拽源，为当前draggable
         * @property {object} source 拖拽起始元素
         * @property {object} proxy 拖拽代理元素
         * @property {var} value 拖拽时需要传递的值
         * @property {number} screenX 鼠标指针相对于屏幕的水平位置
         * @property {number} screenY 鼠标指针相对于屏幕的垂直位置
         * @property {number} clientX 鼠标指针相对于浏览器的水平位置
         * @property {number} clientY 鼠标指针相对于浏览器的垂直位置
         * @property {number} pageX 鼠标指针相对于页面的水平位置
         * @property {number} pageY 鼠标指针相对于页面的垂直位置
         * @property {number} movementX 鼠标指针水平位置相对于上次操作的偏移量
         * @property {number} movementY 鼠标指针垂直位置相对于上次操作的偏移量
         * @property {function} cancel 取消拖拽操作
         */
        this.$emit('drag', Object.assign({
            sender: this,
            origin: this,
            source: _.dom.element(this),
            cancel: this.cancel
         }, manager));
    },
    /**
     * @private
     */
    _dragEnd() {
        let source = this._watchers !== null ? _.dom.element(this) : null;
        source && _.dom.delClass(source, this.data.sourceClass);

        /**
         * @event dragend 拖拽结束时触发
         * @property {object} sender 事件发送对象，为当前draggable
         * @property {object} origin 拖拽源，为当前draggable
         * @property {object} source 拖拽起始元素
         * @property {object} proxy 拖拽代理元素
         */
        this.$emit('dragend', Object.assign({
            sender: this,
            origin: this,
            source
        }, manager));

        if(manager.proxy) {
            if(this.data.proxy instanceof Draggable.Proxy || this.data.proxy === 'clone')
                manager.proxy.parentElement.removeChild(manager.proxy);

            _.dom.delClass(manager.proxy, this.data.proxyClass);
        }
    }
});

Draggable.Proxy = Component.extend({
    name: 'draggable.proxy',
    /**
     * @protected
     */
    init() {
        if(this.$outer instanceof Draggable)
            this.$outer.data.proxy = this;
    }
});

export default Draggable;
