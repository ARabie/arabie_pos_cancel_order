# -*- coding: utf-8 -*-
{
    'name': "POS Cancel Order",

    'summary': """
        POS Cancel Order""",

    'description': """
        POS Cancel Order
    """,

    'author': "Abdulrahman Rabie",

    'category': 'Uncategorized',
    'version': '16.0.1',

    'depends': ['base','point_of_sale'],


    'data': [
        'security/res_groups.xml',
    ],
    'assets': {
         'point_of_sale.assets': [
            'pos_cancel_order/static/src/xml/pos.xml',
            'pos_cancel_order/static/src/js/**/*.js',
        ],
    }
    

}
