odoo.define('pos_cancel_order.TicketScreen', function (require) {
    'use strict';

    const TicketScreen = require('point_of_sale.TicketScreen');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require("@web/core/utils/hooks");
    const { isConnectionError } = require('point_of_sale.utils');
    const session = require('web.session');
    var { Gui } = require('point_of_sale.Gui');
    const PosCancelOrderTicketScreen = (TicketScreen) =>
        class extends TicketScreen {
            //@override
            setup() {
                super.setup();
                useListener('cancel-order', this._onCancelOrder);
                
            }
            async _onDeleteOrder({ detail: order }) {
               var  has_group = await session.user_has_group('pos_cancel_order.group_allow_delete_pos_order')
                if (has_group) {
                    return super._onDeleteOrder(...arguments);
                    }
                else {
                    return Gui.showPopup('ErrorPopup', {
                        title: this.env._t('Delete Ristricted'),
                        body: this.env._t('You are not allowed to delete order, You may cancel order instead.'),
                    });
                }


            }

            async _onCancelOrder({ detail: order }) {
                const { confirmed } = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Cancel Order'),
                    body: _.str.sprintf(
                        this.env._t('%s has a total amount of %s, are you sure you want to cancel this order ?'),
                        order.name, this.getTotal(order)
                    ),
                });
                if (!confirmed) return;
                if (order && (await this._onBeforeDeleteOrder(order))) {
                    if (order === this.env.pos.get_order()) {
                        this._selectNextOrder(order);
                    }
                    order.action_cancel()
                    await this._finalizeValidation(order);
                    
                    
                }
            }
            async _finalizeValidation( order ) { 
                // this part of code is belong to regular odoo workflow in validating order from payment screen
                //  check PaymentScreen.js for more details
                order.initialize_validation_date();
                order.finalized = true;
                let syncOrderResult, hasError;

                try {
                    // 1. Save order to server.
                    syncOrderResult = await this.env.pos.push_single_order(order);

                    // 3. Post process.
                    if (syncOrderResult.length && order.wait_for_push_order()) {
                        const postPushResult = await this._postPushOrderResolve(
                            order,
                            syncOrderResult.map((res) => res.id)
                        );
                        if (!postPushResult) {
                            this.showPopup('ErrorPopup', {
                                title: this.env._t('Error: no internet connection.'),
                                body: this.env._t('Some, if not all, post-processing after syncing order failed.'),
                            });
                        }
                    }
                } catch (error) {
                    if (error.code == 700 || error.code == 701)
                        this.error = true;

                    if ('code' in error) {
                        await this._handlePushOrderError(error);
                    } else {
                        if (isConnectionError(error)) {
                            this.showPopup('OfflineErrorPopup', {
                                title: this.env._t('Connection Error'),
                                body: this.env._t('Order is not synced. Check your internet connection'),
                            });
                        } else {
                            throw error;
                        }
                    }
                } finally {

                    this.env.pos.db.remove_unpaid_order(order);

                    if (!hasError && syncOrderResult && this.env.pos.db.get_orders().length) {
                        const { confirmed } = await this.showPopup('ConfirmPopup', {
                            title: this.env._t('Remaining unsynced orders'),
                            body: this.env._t(
                                'There are unsynced orders. Do you want to sync these orders?'
                            ),
                        });
                        if (confirmed) {
                            this.env.pos.push_orders();
                        }
                    }
                    this.env.pos.removeOrder(order);
                }
                
            }

            _getOrderStates() {
                const result = super._getOrderStates();
                result.set('CANCELLED', { text: this.env._t('Cancelled'), indented: false });
                return result;
            }
            

            getStatus(order) {
                if (order && (order.state == 'cancel' || order.cancelled)) {
                    return this.env._t('Cancelled');
                }
                return super.getStatus(...arguments);
            }
            // @override to fetch synced orders if filter cancelled or synced
            async _onFilterSelected(event) {
                this._state.ui.filter = event.detail.filter;
                if (this._state.ui.filter == 'CANCELLED' || this._state.ui.filter == 'SYNCED') {
                    await this._fetchSyncedOrders();
                }

            }
            getFilteredOrderList() {
                if (this._state.ui.filter == 'CANCELLED') return this._state.syncedOrders.toShow.filter(order => order.state === 'cancel');
                if (this._state.ui.filter == 'SYNCED') return this._state.syncedOrders.toShow.filter(order => order.state !== 'cancel');
                return super.getFilteredOrderList();
            }
        };

    Registries.Component.extend(TicketScreen, PosCancelOrderTicketScreen);

});
