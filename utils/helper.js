exports.getStartDate = (period) => {
  const currentDate = new Date();
  let startDate;

  switch (period) {
    case "1":
      startDate = new Date(currentDate.setHours(0, 0, 0, 0));
      break;
    case "2":
      startDate = new Date(
        currentDate.setDate(currentDate.getDate() - currentDate.getDay())
      );
      startDate.setHours(0, 0, 0, 0);
      break;
    case "3":
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      break;
    case "4":
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0); // If period is not specified, fetch all orders
  }

  return startDate;
};
