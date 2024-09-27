import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { Content } from './Content';

export const EventDataView = ({ data, containerStyle, stores }) => {
    const { title, description } = data;
    return (
        <View style={{ ...styles.containerStyle, ...containerStyle }}>
            <Text style={styles.textDescriptionStyle}>{description}</Text>
            <Content content={data?.content} stores={stores}/>
        </View>
    )
}
EventDataView.propTypes = {
    data: PropTypes.object,
    containerStyle: PropTypes.object,
    stores: PropTypes.shape({
        rootStore: PropTypes.object,
        thredsStore: PropTypes.object,
    })
}

const styles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
        padding: 5
    },
    textDescriptionStyle: {
        padding: 5,
        fontSize: 12,
        fontWeight: 'bold'
    },
}
