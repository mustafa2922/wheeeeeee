import bcrypt from "bcryptjs";

const password = "Strong@pass1234";

const run = async () => {
    const hash = await bcrypt.hash(password, 12);

    console.log("Hash:", hash);
    console.log("");
    console.log("SQL:");
    console.log(`INSERT INTO public.users (email, password, display_name, role)
VALUES ('mustafaraza6372@gmail.com', '${hash}', 'Mustafa Raza', 'super_admin')
ON CONFLICT (email)
DO UPDATE SET role = 'super_admin', password = '${hash}';`);
};

run();