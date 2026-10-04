import { Screen } from '@/components/screen';
import { RequireAuth } from '@/components/require-auth';
import { AppText } from '@/components/text';

export default function CartRoute() {
  return (
    <RequireAuth>
      <Screen title="Cart">
        <AppText role="body">Arrives in a later milestone.</AppText>
      </Screen>
    </RequireAuth>
  );
}
