// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Core;
using Carcass.LocalStorage.Models;
using Inka.Engine.Pipelines.Documents;

namespace Inka.Engine.Pipelines;

public sealed class PipelineContext
{
    public PipelineContext(
        string inputDirectory,
        string outputDirectory,
        string siteTitle
    )
    {
        ArgumentVerifier.NotNull(inputDirectory, nameof(inputDirectory));
        ArgumentVerifier.NotNull(outputDirectory, nameof(outputDirectory));
        ArgumentVerifier.NotNull(siteTitle, nameof(siteTitle));

        InputDirectory = inputDirectory;
        OutputDirectory = outputDirectory;
        SiteTitle = siteTitle;
    }

    public string InputDirectory { get; }
    public string OutputDirectory { get; }
    public string SiteTitle { get; }
    public List<Document> Documents { get; set; } = new();
    public LocalTemporaryDirectory? LocalTemporaryDirectory { get; set; }
}