import React from 'react';
import { View, TextInput, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { RootStore } from '@/src/stores/RootStore';
import { Button } from '@/src/components/common/Button';
import { observer } from 'mobx-react-lite';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

const logo = require('../../assets/initiative-blue.png');
function SignIn() {
  const { authStore, connectionStore, thredsStore } = RootStore.get();
  const { colors } = useTheme();

  const handleMessengerView = async () => {
    if (!authStore.userId) return;
    authStore.setRole('user');
    await connectionStore.connect(authStore.userId);
    await thredsStore.fetchAllThreds(authStore.userId);
    router.replace('/threds/');
  };
  const handleAdminView = async () => {
    if (!authStore.userId) return;
    authStore.setRole('admin');
    await connectionStore.connect(authStore.userId);
    await thredsStore.fetchAllThreds(authStore.userId);
    router.replace('/threds/');
  };

  return (
    <View style={styles.container}>
      <View style={{ width: '100%', alignItems: 'center' }}>
        <Image source={logo} style={[styles.logoStyle]} resizeMode="contain" />
      </View>
      <View style={styles.fieldContainer}>
        <TextInput
          placeholder="User ID"
          placeholderTextColor={'grey'}
          style={styles.textInputStyle}
          value={authStore.userId || ''}
          onChangeText={text => authStore.setUserId(text)}
        />
      </View>
      <View style={styles.fieldContainer}>
        <TextInput
          secureTextEntry={true}
          style={styles.textInputStyle}
          defaultValue=""
          placeholder="Password"
          placeholderTextColor={'grey'}
        />
      </View>
      <Button
        content="Messenger View"
        textStyle={styles.buttonTextStyle}
        buttonStyle={{ ...styles.buttonStyle, backgroundColor: colors.buttonPrimary, marginTop: 30 }}
        onPress={handleMessengerView}
      />
      <Button
        content="Admin View"
        textStyle={styles.buttonTextStyle}
        buttonStyle={{ ...styles.buttonStyle, backgroundColor: colors.buttonPrimary }}
        onPress={handleAdminView}
      />
    </View>
  );
}

export default observer(SignIn);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  textLabelStyle: {
    width: 100,
    textAlign: 'right',
    marginRight: 10,
  },
  textInputStyle: {
    backgroundColor: '#eee',
    width: 200,
    height: 40,
    paddingLeft: 4,
  },
  buttonTextStyle: {
    color: '#fff',
  },
  buttonStyle: {
    marginTop: 20,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    width: 200,
  },
  logoStyle: {
    width: 200,
    height: 100,
    marginTop: 64,
    padding: 0,
  },
});
