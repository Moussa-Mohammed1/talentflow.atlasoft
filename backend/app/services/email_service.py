import os 
from fastapi_mail import FastMail, MessageSchema, MessageType
from app.core.email import conf

class EmailService:
    @staticmethod
    async def send_invitation_email(
        to: str, 
        token: str
    ):
        invitation_link = (
            f"{os.getenv("INVITATION_FRONTEND_URL")}"
            f"/accept-invitation?token={token}"
        )
        html = f"""
            <h2 style="color: #2563eb; margin-bottom: 20px;">
                Bienvenue sur TalentFlow
            </h2>

            <p>
                Bonjour,
            </p>

            <p>
                Vous avez été invité(e) à rejoindre <strong>TalentFlow</strong>, notre plateforme de gestion et de suivi des talents.
            </p>

            <p>
                Afin d'activer votre compte et définir votre mot de passe, veuillez cliquer sur le bouton ci-dessous :
            </p>

            <p style="margin: 30px 0;">
                <a
                    href="{invitation_link}"
                    style="
                        background-color: #2563eb;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: bold;
                        display: inline-block;
                    "
                >
                    Accepter l'invitation
                </a>
            </p>

            <p>
                Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :
            </p>

            <p>
                <a href="{invitation_link}">
                    {invitation_link}
                </a>
            </p>

            <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e5e7eb;">

            <p>
                <strong>Important :</strong> Cette invitation est personnelle et expirera dans <strong>48 heures</strong>.
            </p>

            <p>
                Après votre premier enregistrement, vous pourrez utiliser le mot de passe ci-dessous pour vous connecter une première fois.

                Pour des raisons de sécurité, il est fortement recommandé de le modifier dès votre première connexion.

                Mot de passe temporaire : `{os.getenv('DEFAULT_PASSWORD')}`

            </p>

            <p>
                Cordialement,<br>
                <strong>L'équipe TalentFlow</strong>
            </p>
        """

        message = MessageSchema(
            subject="Invitation à rejoindre TalentFlow",
            recipients=[to],
            body=html,
            subtype=MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)

    @staticmethod
    async def send_otp_email(to: str, otp_code: str):
        html = f"""
            <h2 style="color: #2563eb; margin-bottom: 20px;">
                Réinitialisation de votre mot de passe
            </h2>

            <p>
                Bonjour,
            </p>

            <p>
                Vous avez demandé la réinitialisation de votre mot de passe sur <strong>TalentFlow</strong>.
            </p>

            <p>
                Voici votre code de vérification à usage unique (OTP) :
            </p>

            <p style="margin: 30px 0; text-align: center;">
                <span
                    style="
                        background-color: #f3f4f6;
                        color: #1e3a8a;
                        padding: 16px 32px;
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        border-radius: 8px;
                        display: inline-block;
                        font-family: monospace;
                    "
                >
                    {otp_code}
                </span>
            </p>

            <p>
                Ce code est valable pendant <strong>15 minutes</strong>. Ne le partagez avec personne.
            </p>

            <p>
                Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail.
            </p>

            <hr style="margin: 25px 0; border: 0; border-top: 1px solid #e5e7eb;">

            <p>
                Cordialement,<br>
                <strong>L'équipe TalentFlow</strong>
            </p>
        """

        message = MessageSchema(
            subject="Code de réinitialisation - TalentFlow",
            recipients=[to],
            body=html,
            subtype=MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)