const NotificationBanner = ({ notification }) => {
  if (!notification) return null;
  const a = {success:'bg-green-500',error:'bg-red-500',warning:'bg-yellow-500'};
  const bgColor = a[notification.type] || 'bg-blue-500';
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${bgColor}`}>
      {notification.message}
    </div>
  );
};