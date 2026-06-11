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
            f"{os.getenv("FRONTEND_URL")}"
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
                Si vous n'attendiez pas cette invitation, vous pouvez simplement ignorer cet e-mail.
            </p>

            <p>
                Cordialement,<br>
                <strong>L'équipe TalentFlow</strong>
            </p>
        """

        message = MessageSchema(
            subject="TalentFlow registration invitation",
            recipients=[to],
            body=html,
            subtype=MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)