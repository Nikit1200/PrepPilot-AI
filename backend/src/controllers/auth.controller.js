const userModel = require("../models/user.model")
const authRouter = require("../routes/auth.routes")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
}

async function registerUserController(req,res){

    const {username, email,password} = req.body

    if(!username || !email || !password){
        return res.status(400).json({
            message:"please provide username, email and password"
        })
    }
    
    const hash = await bcrypt.hash(password,10)
const user = await userModel.create({
    username,
    email,
    password:hash
})

const token = jwt.sign(
    { id:user._id, username :user.username  },
    process.env.JWT_SECRET,
    {expiresIn:"1d"}
)

res.cookie("token", token, cookieOptions)

res.status(201).json({
    message:"user registered successfully",
    token,
    user:{
        id:user._id,
        username:user.username,
        email:user.email
    }
})
}

async function loginUserController(req,res){
    const {email, password} = req.body
    const user = await userModel.findOne({email})

    if(!user){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if(!isPasswordValid){
        return res.status(400).json({
            message:"Invalid email or password"
        })
    }

    const token = jwt.sign(
        {id:user._id,username:user.username},
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )

    res.cookie("token", token, cookieOptions)

    res.status(201).json({
        message:"User registered successfully",
        token,
        user:{
            _id:user._id,
            username:user.username,
            email:user.email
        }
    })
}

async function logoutUserController(req,res){
    const token = req.cookies.token
    
    if(token){
        await tokenBlacklistModel.create({token})
    }
    res.clearCookie("token", cookieOptions)

    res.status(200).json({
        message:"User logged out successfully"
    })

}




async function getMeController(req,res){
    const user = await userModel.findById(req.user.id)

    res.status(200).json({
        message:"User details fetched successfully",
        user:{
            id:user._id,
            username:user.username,
            email:user.email
        }
    })
}

module.exports = {
    registerUserController, loginUserController, logoutUserController,getMeController
}
