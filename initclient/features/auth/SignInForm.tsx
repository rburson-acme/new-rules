import { useForm, Controller } from 'react-hook-form';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from './useAuthStore';
import { useConnectionStore } from '../connection/useConnectionStore';

type FormValues = {
  userId: string;
};

const logo = require('../../assets/initiative-blue.png');

export function SignInForm() {
  const { login } = useAuthStore();
  const { connect } = useConnectionStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { userId: '' } });

  const signIn = async (data: FormValues, role: 'admin' | 'user') => {
    login(data.userId, role);
    await connect(data.userId);
    router.replace('/');
  };

  return (
    <View className="flex-1 items-center justify-start bg-background px-5">
      <Image source={logo} style={{ width: 192, height: 96, marginTop: 64 }} resizeMode="contain" />

      <Controller
        control={control}
        name="userId"
        rules={{ required: 'User ID is required' }}
        render={({ field: { onChange, value } }) => (
          <View className="mt-8 w-52">
            <TextInput
              placeholder="User ID"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
              value={value}
              onChangeText={onChange}
              className="bg-background-secondary h-10 px-3 rounded text-text"
            />
            {errors.userId && (
              <Text className="text-red-500 text-xs mt-1">{errors.userId.message}</Text>
            )}
          </View>
        )}
      />

      <View className="mt-4 w-52">
        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          editable={false}
          className="bg-background-secondary h-10 px-3 rounded text-text opacity-40"
        />
        <Text className="text-xs text-icon mt-1 text-center">Password auth coming soon</Text>
      </View>

      {isSubmitting ? (
        <ActivityIndicator className="mt-8" color="#63ADF2" />
      ) : (
        <>
          <TouchableOpacity
            onPress={handleSubmit((data) => signIn(data, 'user'))}
            className="mt-8 w-52 bg-btn-primary py-3 rounded items-center"
          >
            <Text className="text-white font-semibold">Messenger View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit((data) => signIn(data, 'admin'))}
            className="mt-4 w-52 bg-btn-primary py-3 rounded items-center"
          >
            <Text className="text-white font-semibold">Admin View</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
