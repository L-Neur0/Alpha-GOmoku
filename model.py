import torch
import torch.nn as nn
import torch.nn.functional as F
import os

class GomokuNet(nn.Module):
    def __init__(self, game, num_channels=64, dropout=0.3):
        super(GomokuNet, self).__init__()
        self.board_x, self.board_y = game.get_board_size()
        self.action_size = game.get_action_size()

        # Input: batch_size x 1 x board_x x board_y
        self.conv1 = nn.Conv2d(1, num_channels, 3, stride=1, padding=1)
        self.bn1 = nn.BatchNorm2d(num_channels)

        self.conv2 = nn.Conv2d(num_channels, num_channels, 3, stride=1, padding=1)
        self.bn2 = nn.BatchNorm2d(num_channels)

        self.conv3 = nn.Conv2d(num_channels, num_channels, 3, stride=1, padding=1)
        self.bn3 = nn.BatchNorm2d(num_channels)

        self.conv4 = nn.Conv2d(num_channels, num_channels, 3, stride=1, padding=1)
        self.bn4 = nn.BatchNorm2d(num_channels)

        # Policy Head
        self.fc1 = nn.Linear(num_channels * self.board_x * self.board_y, 1024)
        self.fc_bn1 = nn.BatchNorm1d(1024)
        self.fc2 = nn.Linear(1024, 512)
        self.fc_bn2 = nn.BatchNorm1d(512)
        self.fc3 = nn.Linear(512, self.action_size)

        # Value Head
        self.fc4 = nn.Linear(512, 1)

    def forward(self, s):
        # s: batch_size x board_x x board_y
        s = s.view(-1, 1, self.board_x, self.board_y)
        
        s = F.relu(self.bn1(self.conv1(s)))
        s = F.relu(self.bn2(self.conv2(s)))
        s = F.relu(self.bn3(self.conv3(s)))
        s = F.relu(self.bn4(self.conv4(s)))
        
        s = s.view(-1, 64 * self.board_x * self.board_y)

        s = F.dropout(F.relu(self.fc_bn1(self.fc1(s))), p=0.3, training=self.training)
        s = F.dropout(F.relu(self.fc_bn2(self.fc2(s))), p=0.3, training=self.training)

        pi = self.fc3(s) # Policy
        v = self.fc4(s)  # Value

        return F.log_softmax(pi, dim=1), torch.tanh(v)

    def save_checkpoint(self, folder='checkpoint', filename='checkpoint.pth.tar'):
        filepath = os.path.join(folder, filename)
        if not os.path.exists(folder):
            os.mkdir(folder)
        torch.save({
            'state_dict': self.state_dict(),
        }, filepath)

    def load_checkpoint(self, folder='checkpoint', filename='checkpoint.pth.tar'):
        filepath = os.path.join(folder, filename)
        if not os.path.exists(filepath):
            raise ValueError(f"No model in path {filepath}")
        map_location = None if torch.cuda.is_available() else 'cpu'
        checkpoint = torch.load(filepath, map_location=map_location)
        self.load_state_dict(checkpoint['state_dict'])
