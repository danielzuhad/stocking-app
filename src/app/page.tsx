import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

const HomePage = async () => {
  const session = await getServerSession(authOptions);

  console.log({ session });

  return (
    <div>
      <h1>HomePage</h1>
    </div>
  );
};

export default HomePage;
