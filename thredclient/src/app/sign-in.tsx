import React from 'react';
import { View, TextInput, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { RootStore } from '@/src/stores/RootStore';
import { Button } from '@/src/components/common/Button';
import { observer } from 'mobx-react-lite';
import { router } from 'expo-router';

const logo = require('../../assets/new-rules-logo.png');
function SignIn() {
  const { authStore, connectionStore } = RootStore.get();

  const handleMessengerView = async () => {
    if (!authStore.userId) return;
    authStore.setRole('user');
    await connectionStore.connect(authStore.userId);
    router.replace('/messenger');
  };
  const handleAdminView = async () => {
    if (!authStore.userId) return;
    authStore.setRole('admin');
    await connectionStore.connect(authStore.userId);
    router.replace('/admin');
  };

  return (
    <View style={styles.container}>
      <View style={{ width: '100%', alignItems: 'center', marginBottom: 16 }}>
        <Image source={logo} style={[styles.logoStyle]} />
        <View style={styles.logoContainer}>
          <Text style={{ fontFamily: 'Nexa-Heavy', fontSize: 32 }}>New</Text>
          <Text style={{ fontFamily: 'Nexa-ExtraLight', fontSize: 32 }}>Rules</Text>
        </View>
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
        buttonStyle={{ ...styles.buttonStyle, marginTop: 30 }}
        onPress={handleMessengerView}
      />
      <Button
        content="Admin View"
        textStyle={styles.buttonTextStyle}
        buttonStyle={styles.buttonStyle}
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
    backgroundColor: '#4DB9CC',
  },
  logoStyle: {
    resizeMode: 'contain',
    width: Dimensions.get('screen').width * 0.5,
    height: Dimensions.get('screen').height * 0.25,
    margin: 0,
    padding: 0,
  },
});
