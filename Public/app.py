from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)

# Voorbeeldlijsten met reistypes en landen
reistypes = ["fly-drive", "stedentrip", "wintersport", "winteravontuur", "Rondreis", "treinreis"]
landen = ["Nederland", "Spanje", "Italië", "Frankrijk", "Zwitserland", "Duitsland", "Noorwegen", "Zweden", "IJsland", "Scandinavië", "Canada", "Noord-Ierland", "Ierland", "Faeröer Eilanden", "de Verenigde Staten", "Schotland", "Groot Brittannië", "Kroatië", "Albanië", "Argentinië", "Australië", "Borneo", "Costa Rica", "Griekenland", "Indonesië", "Japan", "Myanmar", "Nieuw-Zeeland", "Thailand"]

# Voorbeeld regex patronen
reistype_pattern = re.compile(r"\b(" + "|".join(reistypes) + r")\b", re.IGNORECASE)
landen_pattern = re.compile(r"\b(" + "|".join(landen) + r")\b", re.IGNORECASE)

def extract_info(tekst):
    gevonden_reistypes = reistype_pattern.findall(tekst)
    gevonden_landen = landen_pattern.findall(tekst)

    return {"reistypes": gevonden_reistypes, "landen": gevonden_landen}

@app.route('/extract-info', methods=['POST'])
def extract_info_route():
    data = request.json
    tekst = data.get('tekst')

    if tekst:
        resultaat = extract_info(tekst)
        return jsonify(resultaat)
    else:
        return jsonify({"error": "Geen tekst meegegeven"}), 400

if __name__ == '__main__':
    app.run(debug=False)
