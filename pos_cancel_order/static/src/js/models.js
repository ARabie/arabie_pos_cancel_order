odoo.define('pos_cancel_order.models', function (require) {
"use strict";

const { Order } = require('point_of_sale.models');
const Registries = require('point_of_sale.Registries');


    const PosCancelOrder = (Order) => class PosCancelOrder extends Order {
        constructor(obj, options) {
            super(...arguments);
            this.cancelled = false;
        }
        async action_cancel() {
            this.cancelled = true;
            
        }

        init_from_JSON(json) {
            super.init_from_JSON(...arguments);
            this.locked = ['paid', 'done', 'invoiced', 'cancel'].includes(json.state);            
            this.cancelled = json.state === 'cancel';

        }
        export_as_JSON() {
            const json = super.export_as_JSON(...arguments);
            json.cancelled = this.cancelled;
            return json;
        }
}
    Registries.Model.extend(Order, PosCancelOrder);



});
