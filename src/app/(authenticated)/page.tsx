import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

const HomePage = async () => {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <h1>HomePage</h1>
    </div>
  );
};

export default HomePage;
