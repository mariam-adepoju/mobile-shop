import { Screen } from '@/components/screen';
import { RequireAuth } from '@/components/require-auth';
import { AppText } from '@/components/text';

export default function OrdersRoute() {
  return (
    <RequireAuth>
      <Screen title="Orders">
        <AppText role="body">Arrives in a later milestone.</AppText>
      </Screen>
    </RequireAuth>
  );
}
