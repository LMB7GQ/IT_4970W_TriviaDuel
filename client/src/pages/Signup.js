import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SignupPage(){

  const navigate = useNavigate();

  const [signupUsername,setSignupUsername] = useState("");
  const [signupPassword,setSignupPassword] = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [formMessage,setFormMessage] = useState("");

  const handleCreateAccount = ()=>{

    if(!signupUsername || !signupPassword || !confirmPassword){
      setFormMessage("Please fill out all fields.");
      return;
    }

    if(signupPassword !== confirmPassword){
      setFormMessage("Passwords do not match.");
      return;
    }

    navigate("/modes",{
      state:{playerName:signupUsername}
    });

  };

  return(
    <div className="join-section">

      <h2>Create Account</h2>

      <input
        placeholder="Username"
        value={signupUsername}
        onChange={(e)=>setSignupUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={signupPassword}
        onChange={(e)=>setSignupPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e)=>setConfirmPassword(e.target.value)}
      />

      <button onClick={handleCreateAccount}>
        Create Account
      </button>

      <button onClick={()=>navigate("/")}>
        Back to Login
      </button>

      {formMessage && <p>{formMessage}</p>}

    </div>
  );
}

export default SignupPage;