import React from 'react';
import PropTypes from 'prop-types';
import { Template } from './template/Template';

export const Content = ({ stores }) => {
   return <Template stores={stores}/>;
}

Content.propTypes = {
    content: PropTypes.object,
    stores: PropTypes.shape({
        rootStore: PropTypes.object,
        thredsStore: PropTypes.object,
    })
}